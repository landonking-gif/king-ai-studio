/**
 * SelfRefactorer - Implements ROI Improvement #40
 * Critically analyzes and suggests refactoring for the empire's codebase.
 */

import fs from 'fs';
import path from 'path';

export class SelfRefactorer {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
        this.auditLogger = config.auditLogger;
    }

    /**
     * Analyze a file for potential refactoring
     */
    async analyzeFile(filePath) {
        if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };

        console.log(`[SelfRefactorer] Analyzing ${path.basename(filePath)} for improvements...`);
        const content = fs.readFileSync(filePath, 'utf-8');

        const prompt = `Review this JavaScript code and suggest 3 high-impact performance or readability improvements.
        Then, provide the FULLY REFACTORED code block.
        
        File: ${path.basename(filePath)}
        Content:
        ${content}
        
        Output JSON:
        {
            "improvements": ["list", "of", "changes"],
            "refactored_code": "FULL COMPILABLE CODE HERE"
        }`;

        const response = await this.modelRouter.complete(prompt, 'coding', { format: 'json' });

        if (!response.success) return { success: false, error: response.error };

        try {
            const result = JSON.parse(response.content);

            if (this.auditLogger) {
                this.auditLogger.logSystem('refactoring_suggestion', { file: filePath, improvements: result.improvements });
            }

            return {
                success: true,
                improvements: result.improvements,
                refactoredCode: result.refactored_code,
                originalPath: filePath
            };
        } catch (e) {
            return { success: false, error: 'Failed to parse AI response' };
        }
    }

    /**
     * Apply a refactoring result
     */
    async applyRefactor(analysisResult) {
        if (!analysisResult.success || !analysisResult.refactoredCode) {
            return { success: false, error: 'Invalid analysis result' };
        }

        const filePath = analysisResult.originalPath;
        const backupPath = `${filePath}.bak-${Date.now()}`;

        try {
            // 1. Create backup
            fs.copyFileSync(filePath, backupPath);
            console.log(`[SelfRefactorer] Backup created: ${path.basename(backupPath)}`);

            // 2. Apply refactor
            fs.writeFileSync(filePath, analysisResult.refactoredCode);
            console.log(`[SelfRefactorer] Applied refactor to ${path.basename(filePath)}`);

            return { success: true, backup: backupPath };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

export default SelfRefactorer;
