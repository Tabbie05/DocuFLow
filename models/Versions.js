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
      required: false, // optional so anonymous edits still produce versions
      default: null,
    },
    content: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      default: "Auto-save",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Version || mongoose.model("Version", VersionSchema);