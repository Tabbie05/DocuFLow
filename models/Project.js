import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Project ||
  mongoose.model('Project', ProjectSchema);

  