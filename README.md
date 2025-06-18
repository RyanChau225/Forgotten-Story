# Forgotten Story - Digital Journal Application

A personal journal application that helps you track your daily experiences, emotions, and memories. Built with Next.js, TypeScript, TailwindCSS, and Supabase.

Forgotten Story is designed to be your personal memory vault. Seamlessly transform your handwritten journal entries into digital format, securely save them to the cloud, and rediscover your past with timely email reminders of your cherished moments.

## Features

- 📝 Journal entry creation and management
- 🖼️ Image-to-text conversion using Amazon Textract
- 🏷️ Tag organization system
- 💭 "On This Day" memory features
- 📊 Mood tracking and analytics
- 🔒 Secure authentication with Google OAuth
- 🎨 Modern, responsive UI with TailwindCSS

## Implementation Plan & Todo List

### 1. Database Setup & Core Infrastructure 🔄

#### a. Supabase Setup
- [x] Create Supabase project
- [x] Set up database schema
- [x] Configure Row Level Security (RLS)
- [x] Set up storage buckets for images

#### b. Basic Database Operations
- [x] Implement user operations (create, update, get)
- [x] Set up authentication with Google OAuth
- [x] Create API routes for basic operations

### 2. Journal Entry System 📝

#### a. Entry Management
- [ ] Create entry API endpoints (CRUD)
- [ ] Implement entry validation
- [ ] Add rich text editor
- [ ] Set up draft saving system

#### b. Image Management
- [ ] Set up Supabase storage for images
- [ ] Implement image upload/delete
- [ ] Add image compression
- [ ] Create image gallery component

### 3. Search & Organization 🔍

#### a. Search System
- [ ] Implement full-text search with Supabase
- [ ] Add filters (date, tags, mood)
- [ ] Create search API endpoints
- [ ] Add search results pagination

#### b. Tag System
- [ ] Implement tag CRUD operations
- [ ] Add tag suggestions
- [ ] Create tag cloud component
- [ ] Set up tag statistics

### 4. Memory Features 💭

#### a. "On This Day"
- [ ] Implement memory detection
- [ ] Create notification system
- [ ] Add memory highlights
- [ ] Set up email notifications

### 5. User Management & Settings ⚙️

#### a. User Profiles
- [ ] Complete user settings
- [ ] Add profile customization
- [ ] Implement preferences saving
- [ ] Add account deletion

#### b. Usage Tracking
- [ ] Implement usage metrics
- [ ] Add rate limiting
- [ ] Create usage dashboard

### 6. Analytics & Reporting 📊

#### a. User Analytics
- [ ] Implement mood tracking
- [ ] Add writing statistics
- [ ] Create data visualizations
- [ ] Set up export functionality

### 7. Final Polish ✨

#### a. Performance
- [ ] Implement caching
- [ ] Optimize database queries
- [ ] Add loading states
- [ ] Improve error handling

#### b. UI/UX
- [ ] Add animations
- [ ] Improve responsive design
- [ ] Enhance accessibility
- [ ] Add dark/light themes

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account
- AWS account (for Textract)
- Google Cloud account (for OAuth)

### Environment Variables

Create a `.env.local` file with the following:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# AWS Configuration
AWS_REGION=your-aws-region
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/forgotten-story.git
cd forgotten-story
```

2. Install dependencies
```bash
pnpm install
```

3. Run development server
```bash
pnpm dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

-- 1. Enable RLS on tables
alter table entries enable row level security;
alter table profiles enable row level security;

-- 2. Create policies for Entries table
-- Policy for reading entries
create policy "Users can view own entries"
on entries for select
using (auth.uid() = user_id);

-- Policy for creating entries
create policy "Users can create own entries"
on entries for insert
with check (auth.uid() = user_id);

-- Policy for updating entries
create policy "Users can update own entries"
on entries for update
using (auth.uid() = user_id);

-- Policy for deleting entries
create policy "Users can delete own entries"
on entries for delete
using (auth.uid() = user_id);

-- 3. Create policies for Profiles table
create policy "Users can view own profile"
on profiles for select
using (id = auth.uid());

create policy "Users can update own profile"
on profiles for update
using (id = auth.uid()); 

// RLS is like a security guard for each row in your database
// It automatically filters data based on the logged-in user

// Example: Without RLS
const UNSAFE = {
  // Any user could potentially access all entries
  const { data: allEntries } = await supabase
    .from('entries')
    .select('*')  // Could see everyone's entries!
}

// Example: With RLS
const SAFE = {
  // Users can only see their own entries
  // Even if they try to select all entries
  const { data: myEntries } = await supabase
    .from('entries')
    .select('*')  // Only gets their own entries
} 