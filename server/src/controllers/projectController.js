import Project from '../models/Project.js';
import User from '../models/User.js';
import StockArea from '../models/StockArea.js';

export const createProject = async (req, res) => {
  try {
    const { name, client, location, floors, start_date, status, value, manager_id, org_id } = req.body;
    
    const project = await Project.create({
      name,
      client,
      location,
      floors,
      start_date,
      status,
      value,
      manager_id,
      org_id
    });

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message
    });
  }
};

export const getAllProjects = async (req, res) => {
  try {
    const user = req.user;
    let query = {};

    // If not admin, only show projects where the user is the manager
    if (user.role !== 'admin') {
      query = { manager_id: user.id };
    }

    const projects = await Project.findAll({
      where: query,
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'email']
        },
        {
          model: StockArea,
          as: 'stockAreas',
          attributes: ['area_id', 'area_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'email']
        },
        {
          model: StockArea,
          as: 'stockAreas'
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Access control: if not admin and not manager of this project
    if (req.user.role !== 'admin' && project.manager_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this project'
      });
    }

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: error.message
    });
  }
};

export const updateProject = async (req, res) => {
  try {
    let project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Access control
    if (req.user.role !== 'admin' && project.manager_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project'
      });
    }

    project = await project.update(req.body);

    res.status(200).json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message
    });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Only admin should delete projects usually, but allowing manager for now if needed?
    // Requirement implies structure control, let's restrict delete to admin for safety or manager too.
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete projects'
      });
    }

    await project.destroy();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error.message
    });
  }
};
