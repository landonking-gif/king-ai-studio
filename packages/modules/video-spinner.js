/**
 * VideoSpinner - Implements ROI Improvement #62
 * Creates variations of a master video for different algorithms.
 */

export class VideoSpinner {
    constructor(config = {}) {
        this.modelRouter = config.modelRouter;
    }

    /**
     * Generate variations plan for a video script
     */
    async spinVideoScript(originalScript) {
        console.log(`[VideoSpinner] Generating variations for script...`);

        const prompt = `Take this video script and generate 3 "spun" variations optimized for different platforms:
        1. TikTok (Fast, chaotic, text-heavy)
        2. YouTube Shorts (Story-driven, loopable)
        3. Instagram Reels (Aesthetic, trend-focused)
        
        Original: "${originalScript}"
        
        Output JSON with 'tiktok', 'shorts', 'reels' keys containing the new scripts.`;

        const response = await this.modelRouter.complete(prompt);
        let spins;
        try {
            spins = JSON.parse(response.text);
        } catch (e) {
            spins = { tiktok: originalScript, shorts: originalScript, reels: originalScript };
        }

        return spins;
    }
}

export default VideoSpinner;
