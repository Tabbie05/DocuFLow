import mongoose from "mongoose";

const FileSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["file", "folder"],
      required: true,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    content: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.models.File ||
  mongoose.model("File", FileSchema);
