const {
    askSupportAssistant,
    findMatchingPolicy,
    KNOWLEDGE_BASE
} = require('../services/ai/supportAssistantService');

describe('AI Context-Aware Customer Support Assistant', () => {
    test('findMatchingPolicy correctly matches cancellation and refund queries', () => {
        const cancelMatch = findMatchingPolicy('Why was I charged a cancellation fee?');
        expect(cancelMatch).toBeDefined();
        expect(cancelMatch.category).toBe('cancellation');

        const refundMatch = findMatchingPolicy('How do I get my money back from a failed payment?');
        expect(refundMatch).toBeDefined();
        expect(refundMatch.category).toBe('refunds');
    });

    test('findMatchingPolicy identifies lost item queries', () => {
        const lostMatch = findMatchingPolicy('I left my bag in the car');
        expect(lostMatch).toBeDefined();
        expect(lostMatch.category).toBe('lost_items');
    });

    test('askSupportAssistant returns policy-grounded answer with confidence', async () => {
        const response = await askSupportAssistant('What is the cancellation policy?');

        expect(response).toHaveProperty('text');
        expect(response.text).toContain('cancellation');
        expect(response.confidence).toBeGreaterThanOrEqual(0.80);
        expect(response.source).toBe('cancellation');
    });

    test('askSupportAssistant handles general out-of-scope question with safe escalation', async () => {
        const response = await askSupportAssistant('Can you write a poem about airplanes?');

        expect(response.text).toContain('support@drivo.com');
        expect(response.source).toBe('general_faq');
    });

    test('askSupportAssistant handles empty query with prompt to ask', async () => {
        const response = await askSupportAssistant('');
        expect(response.text).toContain('Please enter a question');
    });
});
