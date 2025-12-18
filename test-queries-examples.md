ere are test queries that should trigger agent mode and multi-hop search:
Comparison queries
"Compare React vs Vue vs Angular for building modern web applications"
"What's the difference between TypeScript and JavaScript? Which is better for large projects?"
"Compare Python and JavaScript: performance, ecosystem, and use cases"
"Machine learning vs deep learning: differences and when to use each"
Multi-topic / "and" queries
"What are the best practices for React performance and the best state management libraries?"
"Find the top 3 programming languages for web development and their main frameworks"
"Best practices for API security and authentication methods"
"Compare the best cloud providers (AWS, Azure, GCP) and their pricing models"
How-to / step-by-step queries
"How to build a REST API with Node.js: step-by-step guide"
"How does machine learning work? Explain the process from data to predictions"
"Step-by-step guide to deploying a React app to production"
"How to optimize database queries: best practices and techniques"
Sequential / process queries
"First, explain what quantum computing is, then compare it to classical computing, and finally list current applications"
"What is blockchain? How does it work? And what are its main use cases?"
"Explain the software development lifecycle: planning, development, testing, and deployment phases"
Complex research queries
"What are the latest trends in AI? Compare them with trends from 2020"
"Research the history of JavaScript: origins, evolution, and current state"
"Find information about climate change solutions: renewable energy, carbon capture, and policy approaches"
Multi-hop reasoning queries
"What are the best programming languages for beginners? Then find the best learning resources for each"
"Compare cloud storage services, then find pricing information for the top 3 options"
"What is microservices architecture? Then find best practices and common pitfalls"
Expected behavior
Agent mode activates automatically
Query analysis shows complexity detection
Task planning breaks the query into steps
Multi-hop execution runs sequential searches
UI shows thinking indicators and progress updates
Final answer synthesizes information from all searches
Testing tips
Watch the browser console for agent progress logs
Look for the "Agent" badge in the streaming response header
Check for thinking/progress indicators above the response
Verify that the final answer cites sources from multiple search steps
Compare response quality: agent mode should be more comprehensive for complex queries
Start with comparison queries (e.g., "Compare React vs Vue") to see the multi-hop planning and execution in action.