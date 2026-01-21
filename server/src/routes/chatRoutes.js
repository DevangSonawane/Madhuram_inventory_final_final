import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validator.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import {
  getFAQs,
  getFAQById,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  markHelpful,
  logInteraction
} from '../controllers/faqController.js';
import {
  getConversations,
  getConversationById,
  createConversation,
  sendMessage,
  markAsRead,
  updateConversationStatus,
  getUnreadCount,
  searchConversations
} from '../controllers/chatController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// FAQ Routes
router.get(
  '/faqs',
  [
    query('search').optional().isString(),
    query('category').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  getFAQs
);

router.get(
  '/faqs/:id',
  [param('id').isInt()],
  validate,
  getFAQById
);

router.post(
  '/faqs',
  roleGuard('admin'),
  [
    body('question').notEmpty().isString(),
    body('answer').notEmpty().isString(),
    body('category').optional().isString(),
    body('keywords').optional().isArray()
  ],
  validate,
  createFAQ
);

router.put(
  '/faqs/:id',
  roleGuard('admin'),
  [
    param('id').isInt(),
    body('question').optional().isString(),
    body('answer').optional().isString(),
    body('category').optional().isString(),
    body('keywords').optional().isArray(),
    body('is_active').optional().isBoolean()
  ],
  validate,
  updateFAQ
);

router.delete(
  '/faqs/:id',
  roleGuard('admin'),
  [param('id').isInt()],
  validate,
  deleteFAQ
);

router.post(
  '/faqs/:id/helpful',
  [
    param('id').isInt(),
    body('helpful').isBoolean()
  ],
  validate,
  markHelpful
);

router.post(
  '/faqs/interaction',
  [
    body('faq_id').optional().isInt(),
    body('action').isIn(['viewed', 'clicked', 'helpful', 'not_helpful'])
  ],
  validate,
  logInteraction
);

// Chat Routes
router.get(
  '/conversations',
  [
    query('status').optional().isIn(['open', 'active', 'resolved', 'closed']),
    query('search').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  getConversations
);

router.get(
  '/conversations/search',
  roleGuard('admin'),
  [
    query('search').optional().isString(),
    query('status').optional().isIn(['open', 'active', 'resolved', 'closed']),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  searchConversations
);

router.get(
  '/conversations/:id',
  [param('id').isInt()],
  validate,
  getConversationById
);

router.post(
  '/conversations',
  [
    // No body validation needed - conversation is created automatically
  ],
  validate,
  createConversation
);

router.post(
  '/conversations/:id/messages',
  [
    param('id').isInt(),
    body('message').notEmpty().isString().trim()
  ],
  validate,
  sendMessage
);

router.put(
  '/conversations/:id/read',
  [param('id').isInt()],
  validate,
  markAsRead
);

router.put(
  '/conversations/:id/status',
  roleGuard('admin'),
  [
    param('id').isInt(),
    body('status').isIn(['open', 'active', 'resolved', 'closed'])
  ],
  validate,
  updateConversationStatus
);

router.get(
  '/unread-count',
  validate,
  getUnreadCount
);

export default router;

