const express = require("express");
const route = express.Router();

const {verifyAdmin} = require("../middleware/authMiddleware");

const {getAllUsers, updateUser, deleteUser, getUser} = require('../controllers/userController')

route.get('/getAll',verifyAdmin, getAllUsers);
route.put('/update/:id', verifyAdmin, updateUser);
route.delete('/delete/:id',verifyAdmin,  deleteUser);
route.get('/getOne/:id',verifyAdmin, getUser);

module.exports = route;
