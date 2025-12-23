/**
 * Auto Hiring System - Automates talent acquisition
 * Generates job posts, screens resumes, and schedules interviews
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ModelRouter } from '../core/model-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AutoHiring {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/hr');
        this.ensureDataDir();
        this.modelRouter = config.modelRouter || new ModelRouter();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Create a job posting
     */
    async createJobPost(role, description) {
        const prompt = `Write a compelling job description for a ${role}.
Context: ${description}
Include:
- Key Responsibilities
- Required Skills
- "Why join us" section (Remote, AI-driven culture)

Return as structured text.`;

        const result = await this.modelRouter.complete(prompt, 'creative');

        const job = {
            id: `job-${Date.now()}`,
            role,
            description: result.content,
            status: 'open',
            postedAt: new Date().toISOString(),
            applicants: []
        };

        const file = path.join(this.dataDir, 'jobs.json');
        let jobs = [];
        if (fs.existsSync(file)) jobs = JSON.parse(fs.readFileSync(file));
        jobs.push(job);
        fs.writeFileSync(file, JSON.stringify(jobs, null, 2));

        return job;
    }

    /**
     * Screen a resume (simulated)
     */
    async screenResume(jobId, candidate) {
        // candidate: { name, resumeText }

        const prompt = `Screen this resume for the role of (Job ID: ${jobId}).
Resume: ${candidate.resumeText.substring(0, 2000)}...

Rate candidates 0-100 on fit.
Identify 3 strengths and 1 red flag.

Return as JSON: {"score": 0, "strengths": [], "redFlag": "", "recommendInterview": boolean}`;

        const analysis = await this.modelRouter.complete(prompt, 'reasoning');
        let result = {};
        try {
            const jsonMatch = analysis.content.match(/\{[\s\S]*\}/);
            result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch (e) { }

        const screening = {
            candidateId: `cand-${Date.now()}`,
            jobId,
            name: candidate.name,
            score: result.score,
            analysis: result,
            status: result.recommendInterview ? 'interview_ready' : 'rejected'
        };

        const file = path.join(this.dataDir, `candidates-${jobId}.jsonl`);
        fs.appendFileSync(file, JSON.stringify(screening) + '\n');

        return screening;
    }

    async execute(task) {
        if (task.action === 'post_job') return this.createJobPost(task.data.role, task.data.description);
        if (task.action === 'screen') return this.screenResume(task.data.jobId, task.data.candidate);
    }
}
export default AutoHiring;
