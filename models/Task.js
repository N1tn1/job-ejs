const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Task title is required'], 
    trim: true, 
},
  description: { 
    type: String,
    trim: true, 
},
  dueDate: { 
    type: Date,
    validate: {
      validator: function(value) {
        return value > Date.now()
      },
      message: 'Due date must be in the future'
    },
},
  priority: { 
    type: String, 
    enum: {
      values: ['low', 'medium', 'high'], 
      message: 'Priority must be one of: low, medium, high',
    },
    default: 'medium', 
},
  status: { 
    type: String, 
    enum: {
      values: ['to-do', 'in-progress', 'done'], 
      message: 'Status must be one of: to-do, in-progress, done',
    },
    default: 'to-do', 
},
  category: { 
    type: String,
    trim: true, 
},
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'User ID is required'] 
}
}, { timestamps: true})

taskSchema.index({ userId: 1 });

module.exports = mongoose.model('Task', taskSchema);