import ChatConversation from '../models/ChatConversation.js';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import { Op } from 'sequelize';

/**
 * Initialize Socket.IO event handlers for chat
 */
export const initializeChatSocket = (io) => {
  // Store typing users per conversation
  const typingUsers = new Map(); // conversationId -> Set of user IDs

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    const isAdmin = socket.user?.role === 'admin' || socket.user?.email === 'itechseed1@gmail.com';

    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log(`User ${userId} (${socket.user.name}) connected to chat`);

    // Join user's room for notifications
    socket.join(`user_${userId}`);

    // Join admin room if admin
    if (isAdmin) {
      socket.join('admins');
    }

    /**
     * Join a conversation room
     */
    socket.on('join_conversation', async (data) => {
      try {
        const { conversationId } = data;

        if (!conversationId) {
          socket.emit('error', { message: 'Conversation ID required' });
          return;
        }

        // Verify user has access to this conversation
        const conversation = await ChatConversation.findOne({
          where: {
            conversation_id: conversationId,
            [Op.or]: [
              { employee_id: userId },
              { admin_id: userId },
              isAdmin ? {} : { employee_id: userId }
            ]
          }
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found or access denied' });
          return;
        }

        socket.join(`conversation_${conversationId}`);
        socket.emit('joined_conversation', { conversationId });
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    /**
     * Leave a conversation room
     */
    socket.on('leave_conversation', (data) => {
      const { conversationId } = data;
      if (conversationId) {
        socket.leave(`conversation_${conversationId}`);
      }
    });

    /**
     * Send message via WebSocket
     */
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, message } = data;

        if (!conversationId || !message || !message.trim()) {
          socket.emit('error', { message: 'Conversation ID and message are required' });
          return;
        }

        // Verify conversation exists and user has access
        const whereClause = { conversation_id: conversationId };
        if (!isAdmin) {
          whereClause.employee_id = userId;
        }

        const conversation = await ChatConversation.findOne({ where: whereClause });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found or access denied' });
          return;
        }

        // Create message
        const chatMessage = await ChatMessage.create({
          conversation_id: conversationId,
          sender_id: userId,
          message: message.trim()
        });

        // Update conversation
        await conversation.update({
          last_message_at: new Date(),
          status: conversation.status === 'open' ? 'active' : conversation.status,
          admin_id: isAdmin && !conversation.admin_id ? userId : conversation.admin_id
        });

        // Get message with sender info
        const messageWithSender = await ChatMessage.findByPk(chatMessage.message_id, {
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'name', 'email', 'role']
            }
          ]
        });

        // Broadcast to conversation room
        const messageData = messageWithSender.toJSON();
        // Include sender info
        if (messageWithSender.sender) {
          messageData.sender = messageWithSender.sender.toJSON();
        }
        io.to(`conversation_${conversationId}`).emit('new_message', {
          message: messageData
        });

        // Notify admins of new conversation if it's the first message
        if (conversation.status === 'open' && !isAdmin) {
          const employee = await User.findByPk(conversation.employee_id, {
            attributes: ['id', 'name', 'email']
          });
          io.to('admins').emit('new_conversation', {
            conversation: {
              ...conversation.toJSON(),
              employee: employee ? employee.toJSON() : null
            }
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Typing indicator
     */
    socket.on('typing', (data) => {
      try {
        const { conversationId, isTyping } = data;

        if (!conversationId) return;

        if (isTyping) {
          if (!typingUsers.has(conversationId)) {
            typingUsers.set(conversationId, new Set());
          }
          typingUsers.get(conversationId).add(userId);
        } else {
          if (typingUsers.has(conversationId)) {
            typingUsers.get(conversationId).delete(userId);
            if (typingUsers.get(conversationId).size === 0) {
              typingUsers.delete(conversationId);
            }
          }
        }

        // Broadcast typing status to conversation room (except sender)
        socket.to(`conversation_${conversationId}`).emit('typing', {
          conversationId,
          userId,
          userName: socket.user.name,
          isTyping
        });
      } catch (error) {
        console.error('Error handling typing:', error);
      }
    });

    /**
     * Read receipt
     */
    socket.on('read_receipt', async (data) => {
      try {
        const { conversationId } = data;

        if (!conversationId) {
          socket.emit('error', { message: 'Conversation ID required' });
          return;
        }

        // Verify user has access
        const conversation = await ChatConversation.findOne({
          where: {
            conversation_id: conversationId,
            [Op.or]: [
              { employee_id: userId },
              { admin_id: userId },
              isAdmin ? {} : { employee_id: userId }
            ]
          }
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found or access denied' });
          return;
        }

        // Mark all unread messages from other users as read
        const unreadMessages = await ChatMessage.findAll({
          where: {
            conversation_id: conversationId,
            sender_id: { [Op.ne]: userId },
            is_read: false
          }
        });

        if (unreadMessages.length > 0) {
          await ChatMessage.update(
            {
              is_read: true,
              read_at: new Date()
            },
            {
              where: {
                conversation_id: conversationId,
                sender_id: { [Op.ne]: userId },
                is_read: false
              }
            }
          );

          // Notify senders of read receipts
          const senderIds = [...new Set(unreadMessages.map(m => m.sender_id))];
          senderIds.forEach(senderId => {
            io.to(`user_${senderId}`).emit('read_receipt', {
              conversationId,
              readBy: userId,
              readByUserName: socket.user.name
            });
          });
        }
      } catch (error) {
        console.error('Error handling read receipt:', error);
        socket.emit('error', { message: 'Failed to mark as read' });
      }
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from chat`);
      
      // Clean up typing indicators
      typingUsers.forEach((userSet, conversationId) => {
        if (userSet.has(userId)) {
          userSet.delete(userId);
          if (userSet.size === 0) {
            typingUsers.delete(conversationId);
          } else {
            // Notify others that user stopped typing
            socket.to(`conversation_${conversationId}`).emit('typing', {
              conversationId,
              userId,
              isTyping: false
            });
          }
        }
      });
    });
  });
};

