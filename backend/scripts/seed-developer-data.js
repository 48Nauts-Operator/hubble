// ABOUTME: Seed script to add default developer groups and bookmarks
// ABOUTME: Creates Developer Tools and Documentation groups with common links

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function seedDeveloperData() {
  const dbPath = process.env.DATABASE_URL || '/data/hubble.db';
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('Seeding developer data...');

  try {
    // Check if groups already exist
    const existingDevTools = await db.get(
      `SELECT id FROM groups WHERE name = 'Developer Tools'`
    );
    const existingDocs = await db.get(
      `SELECT id FROM groups WHERE name = 'Documentation'`
    );

    // Create Developer Tools group if it doesn't exist
    const devToolsGroupId = existingDevTools?.id || uuidv4();
    if (!existingDevTools) {
      await db.run(
        `INSERT INTO groups (id, name, icon, color, description, created_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [
          devToolsGroupId,
          'Developer Tools',
          '🛠️',
          '#3b82f6', // Blue
          'Essential tools and services for developers'
        ]
      );
    }

    // Create Documentation group if it doesn't exist
    const docsGroupId = existingDocs?.id || uuidv4();
    if (!existingDocs) {
      await db.run(
        `INSERT INTO groups (id, name, icon, color, description, created_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [
          docsGroupId,
          'Documentation',
          '📚',
          '#8b5cf6', // Purple
          'Developer documentation and references'
        ]
      );
    }

    // Developer Tools bookmarks
    const devTools = [
      {
        title: 'Google Workspace',
        url: 'https://workspace.google.com',
        description: 'Google productivity and collaboration tools',
        icon: '📧',
        tags: ['productivity', 'google', 'workspace']
      },
      {
        title: 'Gmail',
        url: 'https://mail.google.com',
        description: 'Google email service',
        icon: '✉️',
        tags: ['email', 'google', 'communication']
      },
      {
        title: 'Slack',
        url: 'https://slack.com',
        description: 'Team communication and collaboration',
        icon: '💬',
        tags: ['chat', 'communication', 'team']
      },
      {
        title: 'GitHub',
        url: 'https://github.com',
        description: 'Code hosting and version control',
        icon: '🐙',
        tags: ['git', 'code', 'repository']
      },
      {
        title: 'Cloudflare Dashboard',
        url: 'https://dash.cloudflare.com',
        description: 'Cloudflare CDN and security services',
        icon: '☁️',
        tags: ['cdn', 'security', 'dns']
      },
      {
        title: 'AWS Console',
        url: 'https://console.aws.amazon.com',
        description: 'Amazon Web Services management console',
        icon: '☁️',
        tags: ['aws', 'cloud', 'infrastructure']
      },
      {
        title: 'Vercel',
        url: 'https://vercel.com',
        description: 'Frontend deployment platform',
        icon: '▲',
        tags: ['deployment', 'hosting', 'frontend']
      },
      {
        title: 'npm',
        url: 'https://www.npmjs.com',
        description: 'Node.js package registry',
        icon: '📦',
        tags: ['npm', 'packages', 'javascript']
      },
      {
        title: 'Docker Hub',
        url: 'https://hub.docker.com',
        description: 'Docker container registry',
        icon: '🐳',
        tags: ['docker', 'containers', 'registry']
      },
      {
        title: 'Linear',
        url: 'https://linear.app',
        description: 'Issue tracking and project management',
        icon: '📋',
        tags: ['issues', 'projects', 'tracking']
      },
      {
        title: 'Figma',
        url: 'https://www.figma.com',
        description: 'Collaborative design tool',
        icon: '🎨',
        tags: ['design', 'ui', 'collaboration']
      },
      {
        title: 'Postman',
        url: 'https://www.postman.com',
        description: 'API development and testing',
        icon: '📮',
        tags: ['api', 'testing', 'development']
      },
      {
        title: 'Railway',
        url: 'https://railway.app',
        description: 'Infrastructure deployment platform',
        icon: '🚂',
        tags: ['deployment', 'infrastructure', 'hosting']
      },
      {
        title: 'Supabase',
        url: 'https://supabase.com',
        description: 'Open source Firebase alternative',
        icon: '🔥',
        tags: ['database', 'auth', 'backend']
      },
      {
        title: 'OpenAI Platform',
        url: 'https://platform.openai.com',
        description: 'OpenAI API and models',
        icon: '🤖',
        tags: ['ai', 'api', 'gpt']
      },
      {
        title: 'Anthropic Console',
        url: 'https://console.anthropic.com',
        description: 'Claude API console',
        icon: '🤖',
        tags: ['ai', 'claude', 'api']
      }
    ];

    // Documentation bookmarks
    const documentation = [
      {
        title: 'Anthropic Docs',
        url: 'https://docs.anthropic.com',
        description: 'Claude AI documentation and guides',
        icon: '📖',
        tags: ['ai', 'claude', 'documentation']
      },
      {
        title: 'MDN Web Docs',
        url: 'https://developer.mozilla.org',
        description: 'Web technology documentation',
        icon: '🦊',
        tags: ['web', 'javascript', 'css', 'html']
      },
      {
        title: 'React Documentation',
        url: 'https://react.dev',
        description: 'Official React documentation',
        icon: '⚛️',
        tags: ['react', 'frontend', 'javascript']
      },
      {
        title: 'TypeScript Docs',
        url: 'https://www.typescriptlang.org/docs',
        description: 'TypeScript language documentation',
        icon: '📘',
        tags: ['typescript', 'javascript', 'types']
      },
      {
        title: 'Node.js Docs',
        url: 'https://nodejs.org/docs',
        description: 'Node.js runtime documentation',
        icon: '📗',
        tags: ['node', 'javascript', 'backend']
      },
      {
        title: 'Tailwind CSS',
        url: 'https://tailwindcss.com/docs',
        description: 'Tailwind CSS framework documentation',
        icon: '🎨',
        tags: ['css', 'tailwind', 'styling']
      },
      {
        title: 'Docker Docs',
        url: 'https://docs.docker.com',
        description: 'Docker container documentation',
        icon: '🐳',
        tags: ['docker', 'containers', 'devops']
      },
      {
        title: 'PostgreSQL Docs',
        url: 'https://www.postgresql.org/docs',
        description: 'PostgreSQL database documentation',
        icon: '🐘',
        tags: ['database', 'sql', 'postgres']
      },
      {
        title: 'Redis Docs',
        url: 'https://redis.io/docs',
        description: 'Redis in-memory database documentation',
        icon: '🔴',
        tags: ['redis', 'cache', 'database']
      },
      {
        title: 'Express.js Guide',
        url: 'https://expressjs.com/en/guide/routing.html',
        description: 'Express.js framework documentation',
        icon: '🚂',
        tags: ['express', 'node', 'backend']
      },
      {
        title: 'Next.js Docs',
        url: 'https://nextjs.org/docs',
        description: 'Next.js React framework documentation',
        icon: '▲',
        tags: ['nextjs', 'react', 'frontend']
      },
      {
        title: 'Vite Guide',
        url: 'https://vitejs.dev/guide',
        description: 'Vite build tool documentation',
        icon: '⚡',
        tags: ['vite', 'build', 'frontend']
      },
      {
        title: 'Python Docs',
        url: 'https://docs.python.org/3',
        description: 'Python programming language documentation',
        icon: '🐍',
        tags: ['python', 'programming', 'backend']
      },
      {
        title: 'Go Documentation',
        url: 'https://go.dev/doc',
        description: 'Go programming language documentation',
        icon: '🐹',
        tags: ['go', 'golang', 'backend']
      },
      {
        title: 'Rust Book',
        url: 'https://doc.rust-lang.org/book',
        description: 'The Rust Programming Language book',
        icon: '🦀',
        tags: ['rust', 'systems', 'programming']
      },
      {
        title: 'GraphQL Docs',
        url: 'https://graphql.org/learn',
        description: 'GraphQL query language documentation',
        icon: '📊',
        tags: ['graphql', 'api', 'query']
      },
      {
        title: 'Kubernetes Docs',
        url: 'https://kubernetes.io/docs',
        description: 'Kubernetes container orchestration docs',
        icon: '☸️',
        tags: ['kubernetes', 'k8s', 'orchestration']
      },
      {
        title: 'AWS Documentation',
        url: 'https://docs.aws.amazon.com',
        description: 'Amazon Web Services documentation',
        icon: '☁️',
        tags: ['aws', 'cloud', 'services']
      },
      {
        title: 'Google Cloud Docs',
        url: 'https://cloud.google.com/docs',
        description: 'Google Cloud Platform documentation',
        icon: '☁️',
        tags: ['gcp', 'google', 'cloud']
      },
      {
        title: 'DevDocs',
        url: 'https://devdocs.io',
        description: 'Combined API documentation browser',
        icon: '📚',
        tags: ['api', 'reference', 'documentation']
      }
    ];

    // Insert developer tools bookmarks
    for (const bookmark of devTools) {
      // Check if bookmark already exists
      const existing = await db.get(
        `SELECT id FROM bookmarks WHERE url = ?`,
        [bookmark.url]
      );
      
      if (!existing) {
        const id = uuidv4();
        await db.run(
          `INSERT INTO bookmarks (
            id, group_id, title, url, description, icon, tags, 
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            id,
            devToolsGroupId,
            bookmark.title,
            bookmark.url,
            bookmark.description,
            bookmark.icon,
            JSON.stringify(bookmark.tags)
          ]
        );
      }
    }

    // Insert documentation bookmarks
    for (const bookmark of documentation) {
      // Check if bookmark already exists
      const existing = await db.get(
        `SELECT id FROM bookmarks WHERE url = ?`,
        [bookmark.url]
      );
      
      if (!existing) {
        const id = uuidv4();
        await db.run(
          `INSERT INTO bookmarks (
            id, group_id, title, url, description, icon, tags,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            id,
            docsGroupId,
            bookmark.title,
            bookmark.url,
            bookmark.description,
            bookmark.icon,
            JSON.stringify(bookmark.tags)
          ]
        );
      }
    }

    console.log('✅ Developer data seeded successfully!');
    console.log(`   - Created ${devTools.length} developer tool bookmarks`);
    console.log(`   - Created ${documentation.length} documentation bookmarks`);

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await db.close();
  }
}

// Run if executed directly
if (require.main === module) {
  seedDeveloperData();
}

module.exports = { seedDeveloperData };