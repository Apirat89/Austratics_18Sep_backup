# Aged Care Analytics Platform 🏥

A modern web application for aged care analytics, featuring authentication, location-based analysis, and AI-powered insights.

## 🚀 Quick Start

**IMPORTANT**: Make sure you're in the correct directory before running commands!

1. Open this project folder in Cursor/VS Code
2. Open terminal and verify you're in the right directory:
   ```bash
   pwd
   # Should show: /Users/[your-username]/AnalyticsCode
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## ✨ Features

- User authentication with Supabase
- Interactive maps powered by MapTiler
- AI chat assistance using Google's Gemini 2.5
- Location-based analytics with hierarchical geographic data
- SA2 insights with comprehensive metrics across 4 categories
- Facility screening tools
- Top lists and rankings
- Statistical analysis with box plots and performance indicators

## 🛠 Tech Stack

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- Supabase for authentication and database
- MapTiler for mapping
- Google Gemini AI for chat
- Deployed on Vercel

## 📁 Project Structure

```
AnalyticsCode/                    ← Your workspace directory
├── src/
│   ├── app/
│   │   ├── page.tsx             ← Main landing page
│   │   ├── auth/
│   │   │   ├── signin/page.tsx  ← Sign in page
│   │   │   └── signup/page.tsx  ← Sign up page
│   │   ├── dashboard/page.tsx   ← Dashboard (after login)
│   │   └── insights/page.tsx    ← SA2 Analytics & Insights
│   ├── components/              ← Reusable React components
│   └── lib/                     ← Utility functions and API clients
├── data/
│   └── sa2/                     ← SA2 geographic and statistical data
│       ├── merged_sa2_data_comprehensive.json  ← Main SA2 dataset
│       └── SA2_2021_AUST.json  ← Geographic correspondence data
├── scripts/
│   └── merge_sa2_correspondence.js  ← Data processing scripts
├── package.json                 ← Dependencies and scripts
└── README.md                    ← This file
```

## 🔧 Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Gemini API
GOOGLE_AI_API_KEY=your_gemini_api_key_here

# MapTiler API
NEXT_PUBLIC_MAPTILER_API_KEY=your_maptiler_api_key_here
```

## 🔐 Setting Up Authentication

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Enable Email authentication in the Auth settings
3. Copy your project URL and anon key to the `.env.local` file

## 🗺 Setting Up Maps

1. Create a MapTiler account at [maptiler.com](https://maptiler.com)
2. Get your API key from the dashboard
3. Add it to your `.env.local` file

## 🤖 Setting Up AI Chat

1. Get your Google AI API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your `.env.local` file

## 📊 SA2 Analytics & Geographic Data

The platform includes comprehensive Statistical Area Level 2 (SA2) analytics with hierarchical geographic data.

### 🗺️ Geographic Hierarchy

Each SA2 region includes complete geographic hierarchy:
- **SA2**: Statistical Area Level 2 (smallest geographic unit)
- **SA3**: Statistical Area Level 3 (regional grouping)
- **SA4**: Statistical Area Level 4 (broader regional grouping)
- **State**: Australian State/Territory

### 📈 Available Metrics (53 total across 4 categories)

**🟢 Economics (10 metrics)**
- Employment rates and unemployment statistics
- Income levels (employee, superannuation)
- Property prices and rental costs
- Housing tenure (owned outright %)
- SEIFA socio-economic indexes (advantage/disadvantage)

**🔵 Demographics (9 metrics)**
- Population statistics and density
- Age distribution (55-64, 65+ years)
- Working age population metrics
- Median age

**🟣 Healthcare (18 metrics)**
- Commonwealth Home Support Program data
- Home Care participation and spending
- Residential Care statistics
- Provider numbers and participant ratios

**🔴 Health Statistics (16 metrics)**
- Long-term health conditions (arthritis, diabetes, heart disease, etc.)
- Mental health conditions
- Core activity assistance needs
- Unpaid assistance provision
- Household composition

### 🎯 Features

- **📊 Interactive Box Plots**: Statistical distribution analysis with quartiles and performance indicators
- **🏛️ Hierarchical Comparisons**: Compare SA2 regions at multiple levels:
  - **🇦🇺 National**: Against all 2,454 SA2s across Australia
  - **🏛️ State**: Against SA2s within the same state/territory  
  - **🗺️ SA4**: Against SA2s within the same Statistical Area Level 4
  - **📍 SA3**: Against SA2s within the same Statistical Area Level 3
- **📈 Performance Indicators**: Automatically categorizes SA2 performance (Top 25%, Middle 50%, Bottom 25%)
- **🔍 Search & Filter**: Find SA2s by name, postcode, or geographic hierarchy with proximity suggestions
- **💾 Save & Compare**: Save favorite SA2 regions for quick access and comparison
- **📊 Statistical Analysis**: Min, max, quartiles, median, mean calculated at each comparison level
- **🎨 Responsive Design**: Clean, modern interface that works on desktop and mobile devices

### 🔧 Data Processing

The SA2 dataset is created by merging multiple data sources:
- **Demographics**: ABS Census 2021 data
- **Economics**: ABS Economic statistics
- **Health Stats**: ABS Health condition data  
- **Healthcare**: Department of Social Services aged care data
- **Geographic**: ABS Geographic correspondence (SA2→SA3→SA4→State)

Use `scripts/merge_sa2_correspondence.js` to reprocess geographic correspondence data if needed.

## 📋 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `node scripts/merge_sa2_correspondence.js` | Reprocess SA2 geographic data |

### 🔗 Key Pages

- **Home**: [http://localhost:3000](http://localhost:3000) - Landing page
- **Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard) - Main dashboard (requires auth)
- **SA2 Insights**: [http://localhost:3000/insights](http://localhost:3000/insights) - SA2 analytics platform

## 🚀 Deployment

The application is designed to be deployed on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy!

## 🐛 Troubleshooting

### "npm error Missing script: 'dev'"
- Make sure you're in the correct directory (`AnalyticsCode`)
- Run `pwd` to check your current directory
- If you're in the wrong directory, use `cd` to navigate to the project root

### "This site can't be reached"
- Make sure the development server is running (`npm run dev`)
- Check that you're visiting http://localhost:3000
- Try stopping the server (Ctrl+C) and restarting it

### Changes not showing up
- Hard refresh your browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Make sure you're editing files in the correct directory
- Check the terminal for compilation errors

## 📞 Need Help?

If you encounter any issues:
1. Check that you're in the correct directory
2. Make sure all dependencies are installed (`npm install`)
3. Verify the development server is running
4. Check for any error messages in the terminal
