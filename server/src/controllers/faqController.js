import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import FAQ from '../models/FAQ.js';
import FAQInteraction from '../models/FAQInteraction.js';

/**
 * Search FAQs by keyword
 */
export const getFAQs = async (req, res, next) => {
  try {
    const { search, category, limit = 10 } = req.query;
    const userId = req.user?.id || req.user?.user_id;

    const whereClause = {
      is_active: true
    };

    if (category) {
      whereClause.category = category;
    }

    let faqs;
    
    if (search) {
      // Use FULLTEXT search if available, otherwise use LIKE
      try {
        faqs = await FAQ.findAll({
          where: {
            ...whereClause,
            [Op.or]: [
              sequelize.literal(`MATCH(question, answer) AGAINST('${search}' IN NATURAL LANGUAGE MODE)`),
              { question: { [Op.like]: `%${search}%` } },
              { answer: { [Op.like]: `%${search}%` } }
            ]
          },
          limit: parseInt(limit),
          order: [['view_count', 'DESC'], ['helpful_count', 'DESC']]
        });
      } catch (error) {
        // Fallback to LIKE if FULLTEXT fails
        faqs = await FAQ.findAll({
          where: {
            ...whereClause,
            [Op.or]: [
              { question: { [Op.like]: `%${search}%` } },
              { answer: { [Op.like]: `%${search}%` } }
            ]
          },
          limit: parseInt(limit),
          order: [['view_count', 'DESC'], ['helpful_count', 'DESC']]
        });
      }

      // Log search interaction
      if (userId) {
        await FAQInteraction.create({
          user_id: userId,
          faq_id: null,
          action: 'viewed'
        });
      }
    } else {
      faqs = await FAQ.findAll({
        where: whereClause,
        limit: parseInt(limit),
        order: [['view_count', 'DESC'], ['helpful_count', 'DESC']]
      });
    }

    res.status(200).json({
      success: true,
      data: {
        faqs
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get FAQ by ID
 */
export const getFAQById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.user_id;

    const faq = await FAQ.findByPk(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found',
        code: 'FAQ_NOT_FOUND'
      });
    }

    // Increment view count
    await faq.increment('view_count');

    // Log interaction
    if (userId) {
      await FAQInteraction.create({
        user_id: userId,
        faq_id: faq.faq_id,
        action: 'clicked'
      });
    }

    res.status(200).json({
      success: true,
      data: { faq }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create FAQ (Admin only)
 */
export const createFAQ = async (req, res, next) => {
  try {
    const { question, answer, category, keywords } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Question and answer are required',
        code: 'VALIDATION_ERROR'
      });
    }

    const faq = await FAQ.create({
      question,
      answer,
      category: category || null,
      keywords: keywords || []
    });

    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: { faq }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update FAQ (Admin only)
 */
export const updateFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { question, answer, category, keywords, is_active } = req.body;

    const faq = await FAQ.findByPk(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found',
        code: 'FAQ_NOT_FOUND'
      });
    }

    await faq.update({
      question: question || faq.question,
      answer: answer || faq.answer,
      category: category !== undefined ? category : faq.category,
      keywords: keywords !== undefined ? keywords : faq.keywords,
      is_active: is_active !== undefined ? is_active : faq.is_active
    });

    res.status(200).json({
      success: true,
      message: 'FAQ updated successfully',
      data: { faq }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete FAQ (Admin only - soft delete)
 */
export const deleteFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findByPk(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found',
        code: 'FAQ_NOT_FOUND'
      });
    }

    // Soft delete
    await faq.update({ is_active: false });

    res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark FAQ as helpful or not helpful
 */
export const markHelpful = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body; // true or false
    const userId = req.user?.id || req.user?.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const faq = await FAQ.findByPk(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found',
        code: 'FAQ_NOT_FOUND'
      });
    }

    // Update helpful count
    if (helpful === true) {
      await faq.increment('helpful_count');
    } else if (helpful === false) {
      await faq.increment('not_helpful_count');
    }

    // Log interaction
    await FAQInteraction.create({
      user_id: userId,
      faq_id: faq.faq_id,
      action: helpful ? 'helpful' : 'not_helpful'
    });

    res.status(200).json({
      success: true,
      message: 'Feedback recorded',
      data: { faq }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log FAQ interaction
 */
export const logInteraction = async (req, res, next) => {
  try {
    const { faq_id, action } = req.body;
    const userId = req.user?.id || req.user?.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    if (!action || !['viewed', 'clicked', 'helpful', 'not_helpful'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Valid action is required',
        code: 'VALIDATION_ERROR'
      });
    }

    await FAQInteraction.create({
      user_id: userId,
      faq_id: faq_id || null,
      action
    });

    res.status(200).json({
      success: true,
      message: 'Interaction logged'
    });
  } catch (error) {
    next(error);
  }
};

