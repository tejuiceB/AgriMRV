import express from 'express';
import * as userController from '../controllers/userController';

const router = express.Router();

// GET /users - Get all users
router.get('/', userController.getUsers);

// GET /users/:id - Get user by ID
router.get('/:id', userController.getUserById);

// POST /users - Create a new user
router.post('/', userController.createUser);

// PUT /users/:id - Update a user
router.put('/:id', userController.updateUser);

// DELETE /users/:id - Delete a user
router.delete('/:id', userController.deleteUser);

export default router;
