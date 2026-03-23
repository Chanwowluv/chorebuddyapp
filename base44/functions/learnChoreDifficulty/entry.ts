import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { isParent, getUserFamilyId } from './lib/shared-utils.ts';

/**
 * Analyzes chore completion data to learn and adjust difficulty perceptions.
 * This function processes historical completion data to calculate:
 * - Average completion times
 * - Difficulty adjustment scores based on user feedback
 * - Completion counts for learning
 */

const DIFFICULTY_SCORES = {
    'easy': 1,
    'medium': 2,
    'hard': 3
};

const DIFFICULTY_RATING_ADJUSTMENTS = {
    'too_easy': -0.3,
    'just_right': 0,
    'too_hard': 0.3
};

/**
 * Calculate adjusted difficulty score based on feedback
 */
function calculateAdjustedDifficulty(baseScore, ratings) {
    if (ratings.length === 0) return baseScore;
    
    const totalAdjustment = ratings.reduce((sum, rating) => {
        return sum + (DIFFICULTY_RATING_ADJUSTMENTS[rating] || 0);
    }, 0);
    
    const avgAdjustment = totalAdjustment / ratings.length;
    const adjustedScore = Math.max(0.5, Math.min(3.5, baseScore + avgAdjustment));
    
    return Math.round(adjustedScore * 10) / 10; // Round to 1 decimal
}

/**
 * Map adjusted score back to difficulty category
 */
function getAdjustedDifficultyLabel(score) {
    if (score < 1.5) return 'easier_than_labeled';
    if (score > 2.5) return 'harder_than_labeled';
    return 'matches_label';
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only parents can trigger learning
        if (!isParent(user)) {
            return Response.json({ error: 'Forbidden: Only parents can trigger difficulty learning' }, { status: 403 });
        }

        const familyId = getUserFamilyId(user);
        if (!familyId) {
            return Response.json({ error: 'No family found' }, { status: 400 });
        }

        const { choreId, analyzeAll } = await req.json().catch(() => ({}));

        // Fetch chores to analyze
        let choresToAnalyze = [];
        if (choreId) {
            const chore = await base44.entities.Chore.get(choreId);
            if (!chore || chore.family_id !== familyId) {
                return Response.json({ error: 'Chore not found' }, { status: 404 });
            }
            choresToAnalyze = [chore];
        } else if (analyzeAll) {
            choresToAnalyze = await base44.asServiceRole.entities.Chore.filter({ family_id: familyId });
        } else {
            return Response.json({ error: 'Must specify choreId or analyzeAll' }, { status: 400 });
        }

        if (choresToAnalyze.length === 0) {
            return Response.json({ 
                success: true, 
                message: 'No chores to analyze',
                updatedChores: []
            });
        }

        // Fetch all completion data for this family
        const allCompletions = await base44.asServiceRole.entities.ChoreCompletion.filter({
            family_id: familyId
        });

        const updatedChores = [];
        const learningResults = [];

        // Process each chore
        for (const chore of choresToAnalyze) {
            const choreCompletions = allCompletions.filter(c => c.chore_id === chore.id);
            
            if (choreCompletions.length === 0) {
                // No completion data yet, skip this chore
                continue;
            }

            // Calculate metrics
            const completionCount = choreCompletions.length;
            const difficultyRatings = choreCompletions
                .filter(c => c.difficulty_rating)
                .map(c => c.difficulty_rating);

            // Get base difficulty score
            const baseScore = DIFFICULTY_SCORES[chore.difficulty] || 2;
            
            // Calculate adjusted difficulty score
            const adjustedScore = calculateAdjustedDifficulty(baseScore, difficultyRatings);
            const adjustedLabel = getAdjustedDifficultyLabel(adjustedScore);

            // Calculate average completion time (if we have estimated times)
            // Note: In future, we could track actual completion time
            const avgTime = chore.estimated_time || 30; // fallback to 30 min

            // Prepare update data
            const updateData = {
                completion_count: completionCount,
                average_completion_time: avgTime
            };

            // Store adjusted difficulty as custom data
            if (!chore.data) {
                updateData.data = {};
            } else {
                updateData.data = { ...chore.data };
            }
            
            updateData.data.adjusted_difficulty_score = adjustedScore;
            updateData.data.adjusted_difficulty_label = adjustedLabel;
            updateData.data.difficulty_feedback_count = difficultyRatings.length;
            updateData.data.last_difficulty_analysis = new Date().toISOString();

            // Update the chore
            await base44.asServiceRole.entities.Chore.update(chore.id, updateData);

            updatedChores.push(chore.id);
            learningResults.push({
                choreId: chore.id,
                choreTitle: chore.title,
                baseDifficulty: chore.difficulty,
                completionCount,
                feedbackCount: difficultyRatings.length,
                adjustedScore,
                adjustedLabel,
                improvement: adjustedScore !== baseScore ? `${baseScore} → ${adjustedScore}` : 'no change'
            });
        }

        return Response.json({
            success: true,
            message: `Analyzed ${choresToAnalyze.length} chore(s), updated ${updatedChores.length}`,
            updatedChores,
            learningResults,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Learn Chore Difficulty Error:", error);
        return Response.json({ 
            error: error.message || 'Failed to analyze chore difficulty',
            success: false
        }, { status: 500 });
    }
});