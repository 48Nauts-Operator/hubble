const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  try {
    // Get changed files in this PR
    const changedFiles = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(file => file && !file.startsWith('.git'))
      .filter(file => {
        // Filter for code files only
        const codeExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb', '.swift', '.kt'];
        return codeExtensions.some(ext => file.endsWith(ext));
      });

    if (changedFiles.length === 0) {
      console.log('No code files changed in this PR');
      return;
    }

    console.log(`Reviewing ${changedFiles.length} files:`, changedFiles);

    // Read file contents
    const fileContents = changedFiles.map(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        return { file, content, size: content.length };
      } catch (error) {
        console.log(`Could not read ${file}: ${error.message}`);
        return null;
      }
    }).filter(Boolean);

    // Limit total content size (API limits)
    const maxTotalSize = 100000; // 100KB limit
    let totalSize = 0;
    const filesToReview = [];
    
    for (const fileData of fileContents) {
      if (totalSize + fileData.size <= maxTotalSize) {
        filesToReview.push(fileData);
        totalSize += fileData.size;
      } else {
        console.log(`Skipping ${fileData.file} - would exceed size limit`);
      }
    }

    if (filesToReview.length === 0) {
      console.log('No files to review (all too large or unreadable)');
      return;
    }

    // Prepare content for Claude
    const fileContentsText = filesToReview.map(({ file, content }) => 
      `## File: ${file}\n\`\`\`\n${content}\n\`\`\``
    ).join('\n\n');

    // Call Claude API
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Please review this code for potential issues, improvements, and best practices. Focus on:
- Code quality and maintainability
- Potential bugs or security issues
- Performance considerations
- Best practices for the language/framework
- Documentation and clarity

Be concise but thorough. Format your response as a markdown code review.

${fileContentsText}`
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });

    const review = response.data.content[0].text;

    // Post review as PR comment
    const prNumber = process.env.GITHUB_REF.split('/')[2];
    const repoOwner = process.env.GITHUB_REPOSITORY.split('/')[0];
    const repoName = process.env.GITHUB_REPOSITORY.split('/')[1];

    await axios.post(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${prNumber}/comments`, {
      body: `## 🤖 Claude Code Review\n\n${review}`
    }, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    console.log('Claude review posted successfully!');

  } catch (error) {
    console.error('Error during Claude review:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    process.exit(1);
  }
}

main();