/**
 * Generative AI Customer Assistant Test Suite
 * 
 * Verifies:
 * 1. Natural Language Variations (conversational phrasing without rigid keywords)
 * 2. Multi-turn Conversational Memory & Pronoun Resolution
 * 3. Live Data Grounding & No Hallucination rule
 * 4. Hybrid Intelligence (Mixed queries: Live Data + RAG)
 * 5. Static Knowledge RAG (FAQs, Cancellation, Payment Methods, How Drivo works)
 * 6. Action Safety & Confirmation Guidance
 * 7. Tenant Isolation & Security
 */

const { processAssistantChat, classifyIntentAndRouting, resolveConversationalContext } = require('../services/ai/assistantOrchestrator');
const { searchKnowledgeBase } = require('../services/ai/ragService');
const assistantTools = require('../services/ai/assistantTools');

describe('Drivo Generative AI Customer Assistant', () => {
    const riderAuth = {
        userId: '60d5ec49f1b2c82b8c847c22',
        role: 'user'
    };

    const captainAuth = {
        captainId: '60d5ec49f1b2c82b8c847c11',
        role: 'captain'
    };

    // ─── 1. Natural Language Variations ──────────────────────────────────────────
    describe('Natural Language Variations Understanding', () => {
        test('understands "Where\'s my guy?" as driver location query', async () => {
            const res = await processAssistantChat("Where's my guy?", riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDER_CURRENT_DRIVER');
            expect(res.toolCalls.map(t => t.tool)).toEqual(expect.arrayContaining(['getDriverLocation']));
        });

        test('understands "Is my driver nearby?" as driver proximity query', async () => {
            const res = await processAssistantChat("Is my driver nearby?", riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDER_CURRENT_DRIVER');
        });

        test('understands "How long until he gets here?" as arrival ETA query', async () => {
            const res = await processAssistantChat("How long until he gets here?", riderAuth);
            expect(res.success).toBe(true);
            expect(['RIDER_CURRENT_DRIVER', 'RIDER_TRIP_ETA']).toContain(res.metadata.intent);
        });

        test('understands "My driver location?" without full sentence', async () => {
            const res = await processAssistantChat("My driver location?", riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDER_CURRENT_DRIVER');
        });

        test('understands "How far away is my driver?"', async () => {
            const res = await processAssistantChat("How far away is my driver?", riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDER_CURRENT_DRIVER');
        });

        test('understands "What\'s the status of my current ride?"', async () => {
            const res = await processAssistantChat("What's the status of my current ride?", riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDE_STATUS');
        });

        test('understands "Who is my driver?"', async () => {
            const res = await processAssistantChat("Who is my driver?", riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDER_CURRENT_DRIVER');
        });

        test('understands "Show me my recent rides."', async () => {
            const res = await processAssistantChat("Show me my recent rides.", riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDE_HISTORY');
        });

        test('understands "How much did I pay for my last ride?"', async () => {
            const res = await processAssistantChat("How much did I pay for my last ride?", riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDE_HISTORY');
        });

        test('understands "Can I cancel my current ride?" and explains confirmation flow', async () => {
            const res = await processAssistantChat("Can I cancel my current ride?", riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('RIDE_CANCELLATION_ACTION');
            expect(res.answer.toLowerCase()).toContain('cancel');
        });

        test('understands "How do I book a ride?" using Drivo guide', async () => {
            const res = await processAssistantChat("How do I book a ride?", riderAuth);
            expect(res.success).toBe(true);
            expect(res.answer.toLowerCase()).toContain('ride');
            expect(res.sources.length).toBeGreaterThan(0);
        });

        test('understands "What payment methods do you support?"', async () => {
            const res = await processAssistantChat("What payment methods do you support?", riderAuth);
            expect(res.success).toBe(true);
            expect(res.sources.length).toBeGreaterThan(0);
            expect(res.sources[0].category).toMatch(/payment/i);
        });
    });

    // ─── 2. Multi-turn Conversational Memory ────────────────────────────────────
    describe('Conversational Memory & Follow-up Resolution', () => {
        test('resolves pronoun "he" from previous driver turn', () => {
            const history = [
                { role: 'user', content: 'Where is my driver?' },
                { role: 'assistant', content: 'Your driver Rahul is 1.8 km away in a White Swift Dzire and should arrive in approximately 5 minutes.' }
            ];

            const { resolvedQuery, followUpType } = resolveConversationalContext("How long will he take?", history);
            expect(followUpType).toBe('DRIVER_ETA_FOLLOWUP');
            expect(resolvedQuery).toContain('driver arrive');
        });

        test('resolves "Can I cancel?" as current ride cancellation follow-up', () => {
            const history = [
                { role: 'user', content: 'Where is my driver?' },
                { role: 'assistant', content: 'Your driver Rahul is 2 km away.' }
            ];

            const { resolvedQuery, followUpType } = resolveConversationalContext("Can I cancel?", history);
            expect(followUpType).toBe('RIDE_CANCEL_FOLLOWUP');
            expect(resolvedQuery).toContain('cancel my current ride');
        });

        test('maintains multi-turn context across chat execution', async () => {
            const history = [
                { role: 'user', content: 'Where is my driver?' },
                { role: 'assistant', content: 'Your driver Rahul is 2 km away.' }
            ];

            const res = await processAssistantChat("How long will he take?", riderAuth, history);
            expect(res.success).toBe(true);
            expect(res.answer.length).toBeGreaterThan(10);
        });
    });

    // ─── 3. Hybrid Intelligence (Mixed Question: Live Data + RAG) ────────────────
    describe('Hybrid Intelligence', () => {
        test('handles mixed query: "Where is my driver and what happens if I cancel?"', async () => {
            const res = await processAssistantChat("Where is my driver and what happens if I cancel?", riderAuth);
            expect(res.success).toBe(true);
            expect(res.metadata.intent).toBe('MIXED_LOCATION_AND_CANCELLATION');
            expect(res.metadata.requiresLiveData).toBe(true);
            expect(res.metadata.requiresRAG).toBe(true);
            // Must contain both driver/active ride information and cancellation policy details
            expect(res.answer.toLowerCase()).toContain('cancellation');
        });
    });

    // ─── 4. Live Data Rule: Never Guess or Hallucinate ────────────────────────────
    describe('Live Data Rule Enforcement', () => {
        test('never invents driver when user has no active ride', async () => {
            const res = await processAssistantChat("Where is my driver?", riderAuth);
            expect(res.success).toBe(true);
            expect(res.answer.toLowerCase()).toContain('not have an active ride');
            // Must not invent arbitrary driver names or plates
            expect(res.answer).not.toMatch(/Rahul Sharma MH 02 CD 9999/);
        });
    });

    // ─── 5. Security & Action Safety ─────────────────────────────────────────────
    describe('Security & Action Safety', () => {
        test('rejects cross-user tenant violation', async () => {
            const res = await processAssistantChat("Show me another user's ride history", riderAuth);
            expect(res.success).toBe(true);
            expect(res.answer.toLowerCase()).toContain('access denied');
            expect(res.metadata.intent).toBe('UNAUTHORIZED_CROSS_TENANT_ACCESS');
        });

        test('tools enforce authentication context strictly', async () => {
            const profile = await assistantTools.getUserProfile({ userId: null, captainId: null });
            expect(profile.success).toBe(false);
            expect(profile.error).toContain('Authentication required');
        });
    });
});
