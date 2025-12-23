/**
 * Social Media Agency Blueprint - Full autonomous business template
 * This is a complete operational plan for the CEO Agent to execute
 */

export const socialMediaAgencyBlueprint = {
    name: 'AI-Powered Social Media Marketing Agency',
    description: 'Fully automated agency that finds clients, creates content, manages accounts, and scales',

    // Phase 1: Business Foundation
    foundation: {
        businessPlan: {
            mission: 'Provide AI-powered social media management that delivers measurable ROI for small businesses',
            revenueModel: 'Monthly retainers ($500-$2000/client) + setup fees ($500)',
            targetMarket: 'Small businesses with 1-50 employees, local service businesses, e-commerce',
            differentiator: 'AI-generated content + automated posting + real-time analytics'
        },

        legalRequirements: [
            { task: 'Form LLC', tool: 'manual', requiresApproval: true, estimatedCost: '$150-500' },
            { task: 'Get EIN from IRS', tool: 'claude_browser', requiresApproval: true },
            { task: 'Business license', tool: 'claude_browser', requiresApproval: true },
            { task: 'Create service agreement template', tool: 'ollama', requiresApproval: true },
            { task: 'Create privacy policy', tool: 'ollama', requiresApproval: true },
            { task: 'Create terms of service', tool: 'ollama', requiresApproval: true }
        ],

        brandIdentity: {
            tasks: [
                { task: 'Generate brand name options', tool: 'ollama' },
                { task: 'Create logo concepts', tool: 'ollama' },
                { task: 'Define brand colors and fonts', tool: 'ollama' },
                { task: 'Create brand guidelines doc', tool: 'google_workspace' }
            ]
        }
    },

    // Phase 2: Infrastructure
    infrastructure: {
        website: {
            tasks: [
                { task: 'Design website mockup', tool: 'ollama' },
                { task: 'Build website (Next.js)', tool: 'github_copilot' },
                { task: 'Create pricing page', tool: 'github_copilot' },
                { task: 'Add contact form → n8n webhook', tool: 'n8n' },
                { task: 'Deploy to Vercel', tool: 'github_copilot' }
            ]
        },

        automationWorkflows: [
            {
                name: 'Lead Capture',
                tool: 'n8n',
                trigger: 'Website form submission',
                steps: [
                    'Capture lead data',
                    'Add to Google Sheet',
                    'Send welcome email',
                    'Create follow-up sequence',
                    'Notify CEO agent'
                ]
            },
            {
                name: 'Client Onboarding',
                tool: 'n8n',
                trigger: 'Contract signed',
                steps: [
                    'Create client folder in Drive',
                    'Send brand questionnaire',
                    'Schedule kickoff call',
                    'Create content calendar',
                    'Setup social account access'
                ]
            },
            {
                name: 'Content Publishing',
                tool: 'n8n',
                trigger: 'Scheduled time',
                steps: [
                    'Pull content from queue',
                    'Post to social platforms',
                    'Track engagement',
                    'Update analytics sheet',
                    'Generate weekly report'
                ]
            }
        ],

        socialAccounts: {
            requiresApproval: true,
            platforms: ['Instagram', 'Facebook', 'LinkedIn', 'Twitter/X'],
            tool: 'claude_browser',
            tasks: [
                { task: 'Create business Instagram', requiresApproval: true },
                { task: 'Create Facebook business page', requiresApproval: true },
                { task: 'Create LinkedIn company page', requiresApproval: true }
            ]
        }
    },

    // Phase 3: Lead Generation
    leadGeneration: {
        scraping: {
            tool: 'n8n',
            sources: [
                { name: 'Google Maps', type: 'Local businesses lacking social presence' },
                { name: 'Yelp', type: 'Service businesses with low ratings' },
                { name: 'LinkedIn', type: 'Business owners in target industries' }
            ],
            workflow: [
                'Scrape business data',
                'Verify contact info',
                'Score lead quality',
                'Add to CRM sheet',
                'Queue for outreach'
            ]
        },

        coldOutreach: {
            tool: 'n8n',
            emailSequence: [
                { day: 0, subject: 'Quick question about {business_name}', type: 'introduction' },
                { day: 3, subject: 'Re: Quick question', type: 'value_add' },
                { day: 7, subject: 'Last chance - free audit', type: 'urgency' }
            ],
            templates: {
                introduction: `Hi {first_name},

I was looking at {business_name}'s social media and noticed you could be getting a lot more customers from Instagram and Facebook.

Would you be interested in a free social media audit? I'll show you exactly what's working for your competitors and how you can do better.

No pitch, just value.

Best,
{agency_name}`,
                value_add: `Hi {first_name},

I did some research and found that businesses like {business_name} are getting 30-50 new leads per month from social media alone.

I put together a quick breakdown of what {competitor_name} is doing that's working so well. Want me to send it over?

Best,
{agency_name}`
            }
        }
    },

    // Phase 4: Client Operations
    clientOperations: {
        contractWorkflow: {
            requiresApproval: true,
            steps: [
                { task: 'Generate contract from template', tool: 'ollama', requiresApproval: true },
                { task: 'Calculate pricing based on scope', tool: 'ollama' },
                { task: 'Send for owner review', tool: 'email', requiresApproval: true },
                { task: 'Send to client via DocuSign', tool: 'n8n', requiresApproval: true },
                { task: 'Track signature status', tool: 'n8n' }
            ]
        },

        contentCreation: {
            workflow: [
                { task: 'Analyze client brand', tool: 'ollama' },
                { task: 'Research industry best practices', tool: 'perplexity_comet' },
                { task: 'Generate content calendar', tool: 'ollama' },
                { task: 'Create post copy', tool: 'ollama' },
                { task: 'Generate/source images', tool: 'ollama' },
                { task: 'Schedule posts', tool: 'n8n' }
            ]
        },

        freelancerManagement: {
            requiresApproval: true,
            tasks: [
                { task: 'Find local photographers/videographers', tool: 'perplexity_comet' },
                { task: 'Generate hiring brief', tool: 'ollama' },
                { task: 'Create contractor agreement', tool: 'ollama', requiresApproval: true },
                { task: 'Send job instructions', tool: 'n8n' },
                { task: 'Collect and organize media', tool: 'google_workspace' }
            ]
        },

        paidAdvertising: {
            requiresApproval: true,
            platforms: ['Facebook Ads', 'Instagram Ads'],
            workflow: [
                { task: 'Define target audience', tool: 'ollama' },
                { task: 'Create ad copy variations', tool: 'ollama' },
                { task: 'Set budget (REQUIRES APPROVAL)', tool: 'manual', requiresApproval: true },
                { task: 'Launch campaign', tool: 'claude_browser', requiresApproval: true },
                { task: 'Monitor performance', tool: 'n8n' },
                { task: 'Optimize based on data', tool: 'ollama' }
            ]
        }
    },

    // Phase 5: Growth & Optimization
    growth: {
        analytics: {
            metrics: [
                'Client acquisition cost',
                'Client lifetime value',
                'Content engagement rates',
                'Lead conversion rate',
                'Revenue per client'
            ],
            tool: 'google_workspace',
            frequency: 'weekly'
        },

        selfImprovement: {
            trigger: 'Weekly review',
            tasks: [
                { task: 'Analyze what worked this week', tool: 'ollama' },
                { task: 'Identify bottlenecks', tool: 'ollama' },
                { task: 'Propose improvements', tool: 'ollama' },
                { task: 'Estimate ROI of changes', tool: 'ollama' },
                { task: 'Request approval for major changes', tool: 'email', requiresApproval: true }
            ]
        },

        scaling: {
            triggers: [
                { condition: 'clientCount > 10', action: 'Consider hiring VA' },
                { condition: 'revenue > 10000', action: 'Expand service offerings' },
                { condition: 'leadResponseTime > 2h', action: 'Add more automation' }
            ]
        }
    },

    // Budget Controls
    budgetControls: {
        initialBudget: 5000,
        monthlyBudgetLimit: 2000,
        approvalThresholds: {
            automatic: 50,  // Auto-approve expenses under $50
            review: 500,    // Request review for $50-500
            escalate: 500   // Always escalate over $500
        },
        categories: [
            { name: 'Software/Tools', monthlyLimit: 500 },
            { name: 'Advertising', monthlyLimit: 1000 },
            { name: 'Contractors', monthlyLimit: 500 },
            { name: 'Legal', monthlyLimit: 200 }
        ]
    },

    // Approval Checkpoints
    approvalCheckpoints: [
        'Any legal document or contract',
        'Any financial transaction or commitment',
        'Creating accounts on external platforms',
        'Sending communications to clients',
        'Hiring or paying contractors',
        'Advertising spend over $50',
        'Major system changes'
    ]
};

export default socialMediaAgencyBlueprint;
