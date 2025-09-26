# Chronicle: AI Editor - Assessment Submission

## Task

Chronicle is a simple AI-powered writing assistant web app. It helps users write stories or text, and can automatically continue your writing using AI-generated suggestions (mock api).

## Features

- **Rich Text Editor**: Bold, italic, underline, lists, and more (powered by ProseMirror).
- **AI Writing Assistant**: Click 'Continue Writing' to let AI generate the next part of your story.
- **Error Handling**: Friendly error messages and easy recovery.
- **Responsive UI**: Works well on desktop and mobile.
- **Modern Design**: Styled with Tailwind CSS and Framer Motion for smooth animations.

## Setup Instructions

1. **Install dependencies**:

   ```powershell
   npm install
   ```

2. **Start development server**:

   ```powershell
   npm run dev
   ```

   The app will run at [http://localhost:3000](http://localhost:3000)

3. **Build for production**:

   ```powershell
   npm run build
   ```

4. **Preview production build**:

   ```powershell
   npm run preview
   ```

## Usage

- Start typing in the editor. Use the toolbar for formatting (bold, italic, underline).
- Click 'Continue Writing' to let the AI generate more text based on your input.
- If an error occurs, use the provided buttons to retry or refresh.

## Technical Discussion

- **Frontend**: React + TypeScript, Vite for fast builds.
- **Editor**: ProseMirror with custom schema for underline and lists.
- **AI Simulation**: Uses a mock streaming generator (see `src/machines/editorMachine.ts`).
- **State Management**: XState for editor state and AI streaming.
- **Styling**: Tailwind CSS
- **Error Handling**: Custom error types and boundaries for robust UX.

## Assessment Notes

- Code is modular and readable, with clear separation of concerns.
- Demonstrates knowledge of modern React, state machines, and editor frameworks.
- Easy to extend for real AI integration or more formatting options.
