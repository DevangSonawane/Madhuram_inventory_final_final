import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { 
  getAvailablePages,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions,
  updateUserPermissions,
  getUserEffectivePermissions,
} from '../controllers/pagePermissionController.js';
import {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
} from '../controllers/groupController.js';
import {
  getAllTeams,
  getTeamById,
  getTeamsByGroup,
  createTeam,
  updateTeam,
  deleteTeam,
} from '../controllers/teamController.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { orgContext } from '../middleware/orgContext.js';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validator.js';

const router = express.Router();

// All routes require authentication, org context, and admin role
router.use(authenticate);
router.use(orgContext);
router.use(roleGuard('admin'));

// Settings routes
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Page Permissions routes
router.get('/page-permissions/pages', getAvailablePages);
router.get('/page-permissions/roles/:roleId', getRolePermissions);
router.put('/page-permissions/roles/:roleId', updateRolePermissions);
router.get('/page-permissions/users/:userId', getUserPermissions);
router.put('/page-permissions/users/:userId', updateUserPermissions);
router.get('/page-permissions/users/:userId/effective', getUserEffectivePermissions);

// Groups routes
router.get('/groups', getAllGroups);
router.get('/groups/:id', [
  param('id').isUUID().withMessage('Invalid group ID')
], validate, getGroupById);
router.post('/groups', [
  body('groupName').notEmpty().trim().withMessage('Group name is required'),
  body('description').optional().trim(),
], validate, createGroup);
router.put('/groups/:id', [
  param('id').isUUID().withMessage('Invalid group ID'),
  body('groupName').optional().notEmpty().trim(),
  body('description').optional().trim(),
], validate, updateGroup);
router.delete('/groups/:id', [
  param('id').isUUID().withMessage('Invalid group ID')
], validate, deleteGroup);

// Teams routes
router.get('/teams', getAllTeams);
router.get('/teams/group/:groupId', [
  param('groupId').isUUID().withMessage('Invalid group ID')
], validate, getTeamsByGroup);
router.get('/teams/:id', [
  param('id').isUUID().withMessage('Invalid team ID')
], validate, getTeamById);
router.post('/teams', [
  body('teamName').notEmpty().trim().withMessage('Team name is required'),
  body('groupId').isUUID().withMessage('Valid group ID is required'),
  body('description').optional().trim(),
], validate, createTeam);
router.put('/teams/:id', [
  param('id').isUUID().withMessage('Invalid team ID'),
  body('teamName').optional().notEmpty().trim(),
  body('groupId').optional().isUUID(),
  body('description').optional().trim(),
], validate, updateTeam);
router.delete('/teams/:id', [
  param('id').isUUID().withMessage('Invalid team ID')
], validate, deleteTeam);

export default router;

