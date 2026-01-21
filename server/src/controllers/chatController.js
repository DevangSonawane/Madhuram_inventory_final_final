import { Op } from 'sequelize';
import ChatConversation from '../models/ChatConversation.js';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';

/**
 * Get conversations for user
 * Employees see their own, admins see all
 */
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const isAdmin = req.user?.role === 'admin' || req.user?.email === 'itechseed1@gmail.com';
    const { status, search, limit = 50 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const whereClause = {};

    if (isAdmin) {
      // Admins see all conversations
      if (status) {
        whereClause.status = status;
      }
    } else {
      // Employees see only their own
      whereClause.employee_id = userId;
    }

    let conversations = await ChatConversation.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['last_message_at', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit)
    });

    // If search is provided, filter by employee name or message content
    if (search && isAdmin) {
      const searchLower = search.toLowerCase();
      conversations = conversations.filter(conv => {
        const employeeName = conv.employee?.name?.toLowerCase() || '';
        return employeeName.includes(searchLower);
      });
    }

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await ChatMessage.count({
          where: {
            conversation_id: conv.conversation_id,
            sender_id: { [Op.ne]: userId },
            is_read: false
          }
        });

        return {
          ...conv.toJSON(),
          unreadCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        conversations: conversationsWithUnread
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get conversation by ID with messages
 */
export const getConversationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.user_id;
    const isAdmin = req.user?.role === 'admin' || req.user?.email === 'itechseed1@gmail.com';

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const whereClause = { conversation_id: id };

    // Employees can only see their own conversations
    if (!isAdmin) {
      whereClause.employee_id = userId;
    }

    const conversation = await ChatConversation.findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    // Get messages
    const messages = await ChatMessage.findAll({
      where: { conversation_id: id },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email', 'role']
        }
      ],
      order: [['created_at', 'ASC']],
      limit: 100 // Load last 100 messages
    });

    res.status(200).json({
      success: true,
      data: {
        conversation,
        messages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new conversation (Employee only)
 */
export const createConversation = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const isAdmin = req.user?.role === 'admin' || req.user?.email === 'itechseed1@gmail.com';

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Only employees can create conversations
    if (isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot create conversations',
        code: 'FORBIDDEN'
      });
    }

    // Check if user already has an open conversation
    const existingConversation = await ChatConversation.findOne({
      where: {
        employee_id: userId,
        status: { [Op.in]: ['open', 'active'] }
      }
    });

    if (existingConversation) {
      return res.status(400).json({
        success: false,
        message: 'You already have an open conversation',
        code: 'EXISTING_CONVERSATION',
        data: { conversation: existingConversation }
      });
    }

    const conversation = await ChatConversation.create({
      employee_id: userId,
      admin_id: null,
      status: 'open'
    });

    const conversationWithUser = await ChatConversation.findByPk(conversation.conversation_id, {
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: { conversation: conversationWithUser }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send message in conversation
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user?.id || req.user?.user_id;
    const isAdmin = req.user?.role === 'admin' || req.user?.email === 'itechseed1@gmail.com';

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Verify conversation exists and user has access
    const whereClause = { conversation_id: id };
    if (!isAdmin) {
      whereClause.employee_id = userId;
    }

    const conversation = await ChatConversation.findOne({ where: whereClause });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    // Create message
    const chatMessage = await ChatMessage.create({
      conversation_id: id,
      sender_id: userId,
      message: message.trim()
    });

    // Update conversation last_message_at and status
    await conversation.update({
      last_message_at: new Date(),
      status: conversation.status === 'open' ? 'active' : conversation.status,
      admin_id: isAdmin && !conversation.admin_id ? userId : conversation.admin_id
    });

    const messageWithSender = await ChatMessage.findByPk(chatMessage.message_id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email', 'role']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: messageWithSender }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark messages as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Verify conversation exists and user has access
    const conversation = await ChatConversation.findOne({
      where: {
        conversation_id: id,
        [Op.or]: [
          { employee_id: userId },
          { admin_id: userId }
        ]
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    // Mark all unread messages from other users as read
    await ChatMessage.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: {
          conversation_id: id,
          sender_id: { [Op.ne]: userId },
          is_read: false
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update conversation status (Admin only)
 */
export const updateConversationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id || req.user?.user_id;
    const isAdmin = req.user?.role === 'admin' || req.user?.email === 'itechseed1@gmail.com';

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'FORBIDDEN'
      });
    }

    if (!['open', 'active', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        code: 'VALIDATION_ERROR'
      });
    }

    const conversation = await ChatConversation.findByPk(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    await conversation.update({
      status,
      admin_id: !conversation.admin_id ? userId : conversation.admin_id
    });

    res.status(200).json({
      success: true,
      message: 'Conversation status updated',
      data: { conversation }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread message count for user
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const isAdmin = req.user?.role === 'admin' || req.user?.email === 'itechseed1@gmail.com';

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    let whereClause = {};

    if (isAdmin) {
      // Admins see unread messages in all conversations
      whereClause = {
        sender_id: { [Op.ne]: userId },
        is_read: false
      };
    } else {
      // Employees see unread messages in their conversations
      const userConversations = await ChatConversation.findAll({
        where: { employee_id: userId },
        attributes: ['conversation_id']
      });

      const conversationIds = userConversations.map(c => c.conversation_id);

      whereClause = {
        conversation_id: { [Op.in]: conversationIds },
        sender_id: { [Op.ne]: userId },
        is_read: false
      };
    }

    const unreadCount = await ChatMessage.count({ where: whereClause });

    res.status(200).json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search conversations (Admin only)
 */
export const searchConversations = async (req, res, next) => {
  try {
    const { search, status, limit = 50 } = req.query;
    const isAdmin = req.user?.role === 'admin' || req.user?.email === 'itechseed1@gmail.com';

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'FORBIDDEN'
      });
    }

    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    let conversations = await ChatConversation.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['last_message_at', 'DESC']],
      limit: parseInt(limit)
    });

    // Filter by search term (employee name or message content)
    if (search) {
      const searchLower = search.toLowerCase();
      const conversationIds = conversations.map(c => c.conversation_id);

      // Search in messages
      const messages = await ChatMessage.findAll({
        where: {
          conversation_id: { [Op.in]: conversationIds },
          message: { [Op.like]: `%${search}%` }
        },
        attributes: ['conversation_id'],
        group: ['conversation_id']
      });

      const messageConversationIds = messages.map(m => m.conversation_id);

      conversations = conversations.filter(conv => {
        const employeeName = conv.employee?.name?.toLowerCase() || '';
        return employeeName.includes(searchLower) || messageConversationIds.includes(conv.conversation_id);
      });
    }

    res.status(200).json({
      success: true,
      data: { conversations }
    });
  } catch (error) {
    next(error);
  }
};

