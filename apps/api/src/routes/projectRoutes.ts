import express from 'express';
import * as projectController from '../controllers/projectController';

const router = express.Router();

// GET /projects - Get all projects
router.get('/', projectController.getProjects);

// GET /projects/:id - Get project by ID
router.get('/:id', projectController.getProjectById);

// POST /projects - Create a new project
router.post('/', projectController.createProject);

// PUT /projects/:id - Update a project
router.put('/:id', projectController.updateProject);

// DELETE /projects/:id - Delete a project
router.delete('/:id', projectController.deleteProject);

export default router;
