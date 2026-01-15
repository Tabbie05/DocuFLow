# Overleaf-like Feature Implementation Plan

## Overview
Implement a LaTeX editor flow similar to Overleaf where users can create projects and files with `.tex` extension, including boilerplate code.

## Feature Flow

### 1. Create Project Flow
- User clicks "Create Project" button
- Modal/form appears asking for:
  - Project Name
  - Project Description (optional)
- On submit, create a new project in database
- Automatically create `main.tex` file with LaTeX boilerplate code
- Redirect to project editor page

### 2. File Creation Flow
- User can create new files within a project
- File creation dialog/form:
  - File Name input (user types: "chapter1", "intro", etc.)
  - System automatically appends `.tex` extension
  - Option to choose file type: `.tex` (LaTeX), `.md` (Markdown), or other
- Save file with boilerplate based on type

### 3. Default `main.tex` Boilerplate Code

```latex
\documentclass[12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{amsmath}
\usepackage{amsfonts}
\usepackage{amssymb}
\usepackage{graphicx}
\usepackage{hyperref}

\title{My Document}
\author{Your Name}
\date{\today}

\begin{document}

\maketitle

\begin{abstract}
Your abstract goes here.
\end{abstract}

\section{Introduction}

Your introduction content goes here.

\end{document}
```

## Implementation Steps

### Step 1: Update File Creation Logic
- Modify `addItem` function in `useFileTree.js` hook
- When creating a file with `.tex` extension (or when type is 'file' and no extension), append `.tex`
- Add boilerplate code based on file extension:
  - `.tex` → LaTeX boilerplate
  - `.md` → Markdown boilerplate (optional)

### Step 2: Project Creation Page/Modal
- Create a "Create Project" page or modal component
- Form fields: Project Name, Description
- On submit:
  1. Create project in database (via API)
  2. Create `main.tex` file automatically
  3. Redirect to `/project/[projectId]`

### Step 3: Default File Naming
- First file created in project → `main.tex`
- Subsequent files → user-entered name + `.tex`
- Folder creation remains the same (no extension)

### Step 4: File Type Detection
- Check file extension to determine type
- Render appropriate editor/viewer:
  - `.tex` → LaTeX editor (Monaco with LaTeX syntax highlighting)
  - `.md` → Markdown editor
  - Others → Text editor

## API Changes Needed

### POST `/api/files`
- When creating a file, check if it's the first file in project
- If first file and no name provided, use "main.tex"
- Add boilerplate content based on extension

### POST `/api/projects` (new endpoint)
- Create new project
- Return project ID
- Automatically create main.tex file

## UI/UX Updates

### Home Page
- Add "Create New Project" button
- Show existing projects list
- "Open Project" button for each project

### File Tree Component
- When adding new file, input field with placeholder: "Enter filename (e.g., chapter1)"
- Auto-append `.tex` extension if none provided
- Show file extension in tree view

### File Creation Dialog
- File name input
- Extension selector (optional, defaults to .tex)
- Preview of boilerplate (optional)

## Database Schema
- Files already have: `name`, `type`, `content`, `projectId`, `parentId`
- Ensure `content` field stores boilerplate on creation
- Type can be: "file" or "folder"
- Name should include extension: "main.tex"

## Current State Analysis

### What's Working
- ✅ File tree component structure
- ✅ File creation (addItem function)
- ✅ Folder creation
- ✅ File selection and display

### What Needs to Change
- ⚠️ File naming: Currently user enters name, but no `.tex` auto-append
- ⚠️ Default content: Files are created empty, need boilerplate
- ⚠️ Project creation: Need separate flow for creating projects
- ⚠️ First file: Should automatically be `main.tex` when project is created
- ⚠️ Editor: Need LaTeX editor integration (Monaco with LaTeX support)

## Implementation Priority

1. **High Priority**:
   - Auto-append `.tex` extension to file names
   - Add LaTeX boilerplate when creating `.tex` files
   - Create `main.tex` when project is first opened/created

2. **Medium Priority**:
   - Project creation page/modal
   - File extension validation
   - Show file extensions in tree view

3. **Low Priority**:
   - Multiple file type support (Markdown, etc.)
   - Boilerplate customization
   - Template selection

## Code Changes Required

### File: `hooks/useFileTree.js`
- Update `addItem` function to:
  - Append `.tex` if no extension provided
  - Add boilerplate content for `.tex` files
  - Set default name to "main" if first file in project

### File: `app/api/files/route.js`
- Update POST handler to:
  - Handle first file creation (main.tex)
  - Add boilerplate content based on extension

### New File: `app/(dashboard)/create-project/page.jsx`
- Project creation form
- Handle project creation
- Auto-create main.tex

### File: `app/components/FIle-Tree/FileNode/FileNode.jsx`
- Update file creation input to suggest `.tex` extension
- Show extension in display name

### New File: `lib/latexBoilerplate.js`
- Export default LaTeX boilerplate template
- Export function to generate boilerplate with custom title/author
