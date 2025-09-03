#!/usr/bin/env python3
"""
Claude Codebase Review Script
Analyzes entire codebase and creates GitHub issues for findings
"""

import os
import sys
import json
import time
from pathlib import Path
from typing import List, Dict, Any
import anthropic
from github import Github
import yaml

class ClaudeCodebaseReviewer:
    def __init__(self):
        self.anthropic_key = os.environ.get('ANTHROPIC_API_KEY')
        self.github_token = os.environ.get('GITHUB_TOKEN')
        self.review_type = os.environ.get('REVIEW_TYPE', 'comprehensive')
        self.repo_name = os.environ.get('GITHUB_REPOSITORY', '48Nauts-Operator/nexus-protocol')
        
        if not self.anthropic_key:
            raise ValueError("ANTHROPIC_API_KEY not set")
        if not self.github_token:
            raise ValueError("GITHUB_TOKEN not set")
        
        self.client = anthropic.Anthropic(api_key=self.anthropic_key)
        self.github = Github(self.github_token)
        self.repo = self.github.get_repo(self.repo_name)
        
        # Define review prompts
        self.review_prompts = {
            'comprehensive': """
                Please perform a comprehensive code review of this codebase.
                Look for:
                1. Code quality issues
                2. Security vulnerabilities
                3. Performance problems
                4. Architecture concerns
                5. Missing tests or documentation
                6. Best practice violations
                7. Potential bugs
                8. Technical debt
                
                For each issue found, provide:
                - Severity: critical/high/medium/low
                - Category: security/performance/quality/architecture/documentation
                - File and line number (if applicable)
                - Clear description
                - Suggested fix
            """,
            'security': """
                Perform a security-focused review. Look for:
                - SQL injection vulnerabilities
                - XSS vulnerabilities
                - Authentication/authorization issues
                - Exposed secrets or API keys
                - Insecure dependencies
                - Missing input validation
                - CORS issues
                - Cryptographic weaknesses
            """,
            'performance': """
                Review for performance issues:
                - N+1 queries
                - Memory leaks
                - Inefficient algorithms
                - Missing caching
                - Blocking operations
                - Resource exhaustion risks
                - Database optimization opportunities
            """,
            'architecture': """
                Review the architecture and design:
                - Code organization
                - Separation of concerns
                - Design pattern usage
                - Coupling and cohesion
                - Scalability issues
                - Maintainability concerns
                - Technical debt
            """,
            'bugs': """
                Look for potential bugs:
                - Logic errors
                - Race conditions
                - Null pointer exceptions
                - Off-by-one errors
                - Unhandled exceptions
                - Type mismatches
                - Edge cases not handled
            """
        }
    
    def get_codebase_files(self) -> List[Dict[str, str]]:
        """Collect all relevant code files"""
        files_content = []
        extensions = ['.py', '.js', '.jsx', '.ts', '.tsx', '.json', '.yaml', '.yml', '.md']
        exclude_dirs = {'node_modules', '__pycache__', '.git', 'venv', 'dist', 'build'}
        
        for root, dirs, files in os.walk('.'):
            # Remove excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if any(file.endswith(ext) for ext in extensions):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            if len(content) < 50000:  # Skip very large files
                                files_content.append({
                                    'path': file_path,
                                    'content': content
                                })
                    except Exception as e:
                        print(f"Skipping {file_path}: {e}")
        
        return files_content
    
    def chunk_files_for_review(self, files: List[Dict[str, str]], max_tokens: int = 50000) -> List[List[Dict[str, str]]]:
        """Split files into chunks that fit within token limits"""
        chunks = []
        current_chunk = []
        current_size = 0
        
        for file in files:
            # Rough estimate: 1 token ≈ 4 characters
            file_tokens = len(file['content']) // 4
            
            if current_size + file_tokens > max_tokens:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = [file]
                current_size = file_tokens
            else:
                current_chunk.append(file)
                current_size += file_tokens
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def review_chunk(self, files_chunk: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """Review a chunk of files with Claude"""
        # Prepare the code context
        code_context = "\\n\\n".join([
            f"File: {file['path']}\\n```\\n{file['content']}\\n```"
            for file in files_chunk
        ])
        
        prompt = f"""
        {self.review_prompts[self.review_type]}
        
        Here are the files to review:
        
        {code_context}
        
        Please provide your findings in JSON format:
        {{
            "issues": [
                {{
                    "severity": "critical|high|medium|low",
                    "category": "security|performance|quality|architecture|documentation|bug",
                    "title": "Brief title for the issue",
                    "description": "Detailed description",
                    "file": "path/to/file.py",
                    "line": 123,
                    "suggestion": "How to fix this issue"
                }}
            ]
        }}
        """
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extract JSON from response
            response_text = response.content[0].text
            
            # Find JSON in response
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                issues_data = json.loads(json_match.group())
                return issues_data.get('issues', [])
            
            return []
            
        except Exception as e:
            print(f"Error reviewing chunk: {e}")
            return []
    
    def create_github_issues(self, issues: List[Dict[str, Any]]):
        """Create GitHub issues from findings"""
        created_issues = []
        
        # Group issues by severity
        critical_issues = [i for i in issues if i.get('severity') == 'critical']
        high_issues = [i for i in issues if i.get('severity') == 'high']
        other_issues = [i for i in issues if i.get('severity') in ['medium', 'low']]
        
        # Create individual issues for critical and high severity
        for issue in critical_issues + high_issues:
            try:
                title = f"[Claude Review] {issue['title']}"
                body = f"""
## 🤖 Automated Code Review Finding

**Severity:** {issue.get('severity', 'unknown').upper()}
**Category:** {issue.get('category', 'general')}
**File:** `{issue.get('file', 'N/A')}`
**Line:** {issue.get('line', 'N/A')}

### Description
{issue.get('description', 'No description provided')}

### Suggested Fix
{issue.get('suggestion', 'No suggestion provided')}

---
*This issue was automatically created by Claude Code Review*
*Review Type: {self.review_type}*
"""
                
                # Add labels
                labels = [
                    f"severity:{issue.get('severity', 'unknown')}",
                    f"category:{issue.get('category', 'general')}",
                    "claude-review",
                    "automated"
                ]
                
                # Create the issue
                github_issue = self.repo.create_issue(
                    title=title,
                    body=body,
                    labels=[l for l in labels if self.label_exists(l)]
                )
                
                created_issues.append(github_issue)
                print(f"Created issue: {title}")
                
                # Rate limiting
                time.sleep(2)
                
            except Exception as e:
                print(f"Error creating issue: {e}")
        
        # Create a summary issue for medium/low severity items
        if other_issues:
            self.create_summary_issue(other_issues)
        
        return created_issues
    
    def create_summary_issue(self, issues: List[Dict[str, Any]]):
        """Create a single summary issue for lower severity findings"""
        title = f"[Claude Review] {len(issues)} Medium/Low Priority Findings"
        
        # Group by category
        by_category = {}
        for issue in issues:
            cat = issue.get('category', 'general')
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(issue)
        
        body = f"""
## 🤖 Code Review Summary

Found {len(issues)} medium/low priority issues during automated review.

### Findings by Category
"""
        
        for category, cat_issues in by_category.items():
            body += f"\\n#### {category.title()} ({len(cat_issues)} issues)\\n"
            for issue in cat_issues[:10]:  # Limit to 10 per category
                body += f"- **{issue.get('severity')}**: {issue.get('title')} "
                body += f"(`{issue.get('file', 'N/A')}`)\\n"
        
        body += """

---
*This summary was automatically created by Claude Code Review*
*For detailed information on each issue, please run a targeted review*
"""
        
        try:
            self.repo.create_issue(
                title=title,
                body=body,
                labels=["claude-review", "automated", "summary"]
            )
            print(f"Created summary issue with {len(issues)} findings")
        except Exception as e:
            print(f"Error creating summary issue: {e}")
    
    def label_exists(self, label_name: str) -> bool:
        """Check if a label exists in the repository"""
        try:
            self.repo.get_label(label_name)
            return True
        except:
            # Try to create the label
            try:
                color_map = {
                    'severity:critical': 'd73a4a',  # Red
                    'severity:high': 'e99695',      # Light red
                    'severity:medium': 'f9d71c',    # Yellow
                    'severity:low': '7bbe48',       # Green
                    'claude-review': '0052cc',      # Blue
                    'automated': 'bfdadc',          # Light gray
                }
                color = color_map.get(label_name, 'c5def5')  # Default purple
                self.repo.create_label(label_name, color)
                return True
            except:
                return False
    
    def generate_summary_report(self, all_issues: List[Dict[str, Any]]):
        """Generate a summary report for GitHub Actions"""
        report = f"""
# Claude Code Review Report

**Review Type**: {self.review_type}
**Total Issues Found**: {len(all_issues)}

## Summary by Severity
- Critical: {len([i for i in all_issues if i.get('severity') == 'critical'])}
- High: {len([i for i in all_issues if i.get('severity') == 'high'])}
- Medium: {len([i for i in all_issues if i.get('severity') == 'medium'])}
- Low: {len([i for i in all_issues if i.get('severity') == 'low'])}

## Summary by Category
"""
        
        categories = {}
        for issue in all_issues:
            cat = issue.get('category', 'general')
            categories[cat] = categories.get(cat, 0) + 1
        
        for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
            report += f"- {cat.title()}: {count}\\n"
        
        # Write to file for GitHub Actions summary
        with open('review_summary.md', 'w') as f:
            f.write(report)
        
        print(report)
    
    def run(self):
        """Main execution"""
        print(f"🤖 Starting Claude Codebase Review")
        print(f"   Repository: {self.repo_name}")
        print(f"   Review Type: {self.review_type}")
        print()
        
        # Collect files
        print("📂 Collecting codebase files...")
        files = self.get_codebase_files()
        print(f"   Found {len(files)} files to review")
        
        # Chunk files for review
        chunks = self.chunk_files_for_review(files)
        print(f"   Split into {len(chunks)} chunks for review")
        
        # Review each chunk
        all_issues = []
        for i, chunk in enumerate(chunks, 1):
            print(f"\\n🔍 Reviewing chunk {i}/{len(chunks)}...")
            issues = self.review_chunk(chunk)
            all_issues.extend(issues)
            print(f"   Found {len(issues)} issues")
            
            # Rate limiting
            time.sleep(5)
        
        print(f"\\n📊 Total issues found: {len(all_issues)}")
        
        # Generate summary report
        self.generate_summary_report(all_issues)
        
        # Create GitHub issues
        if all_issues:
            print("\\n📝 Creating GitHub issues...")
            created_issues = self.create_github_issues(all_issues)
            print(f"   Created {len(created_issues)} GitHub issues")
        else:
            print("\\n✅ No issues found!")
        
        print("\\n🎉 Review complete!")

if __name__ == "__main__":
    try:
        reviewer = ClaudeCodebaseReviewer()
        reviewer.run()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)