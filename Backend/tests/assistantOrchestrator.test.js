const { processAssistantChat, classifyIntentAndRouting } = require('../services/ai/assistantOrchestrator');
const { searchKnowledgeBase } = require('../services/ai/ragService');
const assistantTools = require('../services/ai/assistantTools');

describe('GenAI + Tool Calling + RAG Assistant Orchestrator', () => {
    // 1. Natural Language Intent Classification & Intelligent Routing
    test('routes driver query "Who is my rider?" to live driver tools', () => {
        const routing = classifyIntentAndRouting('Who is my rider?', {
            captainId: '60d5ec49f1b2c82b8c847c11',
            role: 'captain'
        });

        expect(routing.intent).toBe('DRIVER_CURRENT_RIDER');
        expect(routing.requiresLiveData).toBe(true);
        expect(routing.toolsToCall).toContain('getCurrentRider');
    });

    test('routes alternative query "Who am I picking up?" to getCurrentRider', () => {
        const routing = classifyIntentAndRouting('Who am I picking up?', {
            captainId: '60d5ec49f1b2c82b8c847c11',
            role: 'captain'
        });

        expect(routing.intent).toBe('DRIVER_CURRENT_RIDER');
        expect(routing.requiresLiveData).toBe(true);
    });

    test('routes rider query "Where is my driver?" to live rider tools', () => {
        const routing = classifyIntentAndRouting('Where is my driver?', {
            userId: '60d5ec49f1b2c82b8c847c22',
            role: 'user'
        });

        expect(routing.intent).toBe('RIDER_CURRENT_DRIVER');
        expect(routing.requiresLiveData).toBe(true);
        expect(routing.toolsToCall).toContain('getCurrentDriver');
    });

    test('routes blended query "Why was I charged surge?" to live data + RAG', () => {
        const routing = classifyIntentAndRouting('Why was I charged surge?', {
            userId: '60d5ec49f1b2c82b8c847c22'
        });

        expect(routing.intent).toBe('FARE_AND_SURGE_EXPLANATION');
        expect(routing.requiresLiveData).toBe(true);
        expect(routing.requiresRAG).toBe(true);
        expect(routing.toolsToCall).toContain('getRideFare');
        expect(routing.toolsToCall).toContain('getSurgeDetails');
    });

    test('routes "What is the cancellation policy?" to pure RAG knowledge search', () => {
        const routing = classifyIntentAndRouting("What's the cancellation policy?", {
            userId: '60d5ec49f1b2c82b8c847c22'
        });

        expect(routing.intent).toBe('POLICY_CANCELLATION');
        expect(routing.requiresLiveData).toBe(false);
        expect(routing.requiresRAG).toBe(true);
    });

    test('routes driver query "How much did I earn today?" to getDriverEarnings', () => {
        const routing = classifyIntentAndRouting('How much did I earn today?', {
            captainId: '60d5ec49f1b2c82b8c847c11',
            role: 'captain'
        });

        expect(routing.intent).toBe('DRIVER_EARNINGS');
        expect(routing.requiresLiveData).toBe(true);
        expect(routing.toolsToCall).toContain('getDriverEarnings');
    });

    test('routes driver query "Where is demand high?" to repositioning and hotspots', () => {
        const routing = classifyIntentAndRouting('Where is demand high? Where should I move to get more rides?', {
            captainId: '60d5ec49f1b2c82b8c847c11',
            role: 'captain'
        });

        expect(routing.intent).toBe('DRIVER_REPOSITIONING');
        expect(routing.requiresLiveData).toBe(true);
        expect(routing.toolsToCall).toContain('getNearbyDemandZones');
        expect(routing.toolsToCall).toContain('getDemandHotspots');
    });

    // 2. Tenant Isolation & Cross-User Security Enforcement
    test('strictly rejects cross-user data requests: "Show me another driver\'s rides"', async () => {
        const response = await processAssistantChat("Show me another driver's rides", {
            captainId: '60d5ec49f1b2c82b8c847c11',
            role: 'captain'
        });

        expect(response.success).toBe(true);
        expect(response.answer.toLowerCase()).toContain('access denied');
        expect(response.toolCalls).toHaveLength(0);
        expect(response.metadata.intent).toBe('UNAUTHORIZED_CROSS_TENANT_ACCESS');
    });

    test('tool getRideDetails rejects unauthorized cross-user access', async () => {
        const dummyRideId = '60d5ec49f1b2c82b8c847c99';
        const unauthContext = { userId: '60d5ec49f1b2c82b8c847c00' };

        const result = await assistantTools.getRideDetails(dummyRideId, unauthContext);
        // Either ride not found or unauthorized
        expect(result.success).toBe(false);
    });

    // 3. RAG Knowledge Base Retrieval
    test('retrieves grounded cancellation policy chunks with metadata', async () => {
        const chunks = await searchKnowledgeBase('cancellation policy free window fee', { topK: 2 });

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[0]).toHaveProperty('documentId');
        expect(chunks[0]).toHaveProperty('title');
        expect(chunks[0]).toHaveProperty('category');
        expect(chunks[0]).toHaveProperty('content');
        expect(chunks[0]).toHaveProperty('source');
        expect(chunks[0].content).toContain('3 minutes');
    });

    test('retrieves grounded refund policy chunks with metadata', async () => {
        const chunks = await searchKnowledgeBase('refund duplicate charges money back', { topK: 2 });

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[0].category).toBe('refunds');
        expect(chunks[0].content).toContain('business days');
    });

    // 4. End-to-End Orchestrator Chat Execution
    test('executes RAG question "What is Drivo\'s cancellation policy?" with source citations', async () => {
        const response = await processAssistantChat('What is Drivo cancellation policy?', {
            userId: '60d5ec49f1b2c82b8c847c22'
        });

        expect(response.success).toBe(true);
        expect(response.answer).toContain('3 minutes');
        expect(response.sources.length).toBeGreaterThan(0);
        expect(response.sources[0].title).toBe('Drivo Cancellation Policy');
    });

    test('handles no-active-ride gracefully without error or hallucination', async () => {
        const response = await processAssistantChat('Where is my driver?', {
            userId: '60d5ec49f1b2c82b8c847c22'
        });

        expect(response.success).toBe(true);
        expect(response.answer.toLowerCase()).toContain('do not have an active ride');
    });

    test('handles driver with no active ride gracefully', async () => {
        const response = await processAssistantChat('Who is my current rider?', {
            captainId: '60d5ec49f1b2c82b8c847c11',
            role: 'captain'
        });

        expect(response.success).toBe(true);
        expect(response.answer.toLowerCase()).toContain('do not have an active trip');
    });

    test('handles empty or malformed query gracefully', async () => {
        const response = await processAssistantChat('', {
            userId: '60d5ec49f1b2c82b8c847c22'
        });

        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
    });
});
