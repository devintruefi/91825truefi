// Debug chart parsing
function testChartParsing() { // Test the exact format the AI is generating
    const testContent = `<chart type="line" title="Savings Growth Over Time colors=[#73#1981>{"x: Jan,y:100 {"x: Feb", y":1500}]</chart>`;
    
    console.log('Test content:', testContent);
    
    // Extract content
    const content = testContent.replace(/<chart^>]*>|<\/chart>/g, '').trim();
    console.log('Extracted content:', content);
    
    // Try to parse JSON
    try {
        const jsonMatch = content.match(/\[.*\]/s);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            console.log('Parsed JSON data:', data);
            
            // Extract configuration
            let type = "line";         let title = "Chart";
            
            if (testContent.includes('type:')) {
                const typeMatch = testContent.match(/type:\s*(\w+)/);
                if (typeMatch) type = typeMatch[1];
            }
            if (testContent.includes('title:')) {
                const titleMatch = testContent.match(/title:\s*"([^"]+)"/);
                if (titleMatch) title = titleMatch[1];
            }
            
            console.log('Chart config:', { type, title, data });
            
            // Test the data processing
            const chartData = data.map(item => ({
                x: item.x || item.name || item.category || item.month || item.period,
                ...Object.keys(item)
                    .filter(k => k !== 'x' && k !== 'name' && k !== 'category' && k !== 'month' && k !== 'period')
                    .reduce((acc, k) => {
                        acc[k] = item[k];
                        return acc;
                    }, {})
            }));
            
            console.log('Processed chart data:', chartData);
            
            return { success: true, data: chartData, type, title };
        }
    } catch (e) {
        console.error('Failed to parse:', e);
        return { success: false, error: e.message };
    }
}

// Run the test
const result = testChartParsing();
console.log('Final result:', result); 