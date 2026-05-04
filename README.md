# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/09635972-a2c2-4b5f-9626-d5f19cc285c0

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/09635972-a2c2-4b5f-9626-d5f19cc285c0) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment separation

Use a separate Supabase project for the private leagues app.

Required variables for the new private app:

```sh
VITE_SUPABASE_URL=https://your-new-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-new-supabase-anon-key
VITE_APP_MODE=private
VITE_APP_URL=https://porraprivada.example.com
```

`laporradelverano.es` can keep using the legacy Supabase project. The code still has a fallback to the current legacy project so the existing site keeps working while the new app is configured with its own environment.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/09635972-a2c2-4b5f-9626-d5f19cc285c0) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
