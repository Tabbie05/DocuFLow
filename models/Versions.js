import mongoose from "mongoose";

const VersionSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    label: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Version ||
  mongoose.model("Version", VersionSchema);

  