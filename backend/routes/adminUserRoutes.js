const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { getAdminUsers, deleteUser } = require("../controllers/adminUserController");

router.get("/", protect, getAdminUsers);
router.delete("/:id", protect, deleteUser);

module.exports = router;