// Debug script to test GitHub workflow connectivity

document.addEventListener('DOMContentLoaded', () => {
    const debugResultEl = document.getElementById('debug-result');
    const debugFormEl = document.getElementById('debug-form');
    const tokenInput = document.getElementById('github-token');
    const ownerInput = document.getElementById('repo-owner');
    const repoInput = document.getElementById('repo-name');
    const workflowInput = document.getElementById('workflow-id');
    const branchInput = document.getElementById('branch-name');
    
    if (debugFormEl) {
        debugFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const token = tokenInput.value.trim();
            const owner = ownerInput.value.trim();
            const repo = repoInput.value.trim();
            const workflow = workflowInput.value.trim();
            const branch = branchInput.value.trim();
            
            if (!token || !owner || !repo || !workflow || !branch) {
                showResult('❌ Please fill in all fields', 'error');
                return;
            }
            
            try {
                // First, check if the repo exists
                showResult('🔍 Testing repository access...', 'info');
                
                const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization': `token ${token}`
                    }
                });
                
                if (!repoResponse.ok) {
                    const errorData = await repoResponse.json();
                    throw new Error(`Repository check failed: ${errorData.message}`);
                }
                
                showResult('✅ Repository access successful', 'success');
                
                // Next, check if the workflow file exists
                showResult('🔍 Checking workflow file...', 'info');
                
                const workflowResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows/${workflow}`, {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization': `token ${token}`
                    }
                });
                
                if (!workflowResponse.ok) {
                    const errorData = await workflowResponse.json();
                    throw new Error(`Workflow file check failed: ${errorData.message}`);
                }
                
                showResult('✅ Workflow file exists', 'success');
                
                // Now, try to trigger the workflow
                showResult('🔍 Attempting to trigger workflow...', 'info');
                
                const triggerResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ref: branch
                    })
                });
                
                if (triggerResponse.status === 204) {
                    showResult('✅ Workflow triggered successfully! Check GitHub Actions for the run.', 'success');
                } else {
                    const errorText = await triggerResponse.text();
                    throw new Error(`Trigger failed with status ${triggerResponse.status}: ${errorText}`);
                }
                
            } catch (error) {
                showResult(`❌ Error: ${error.message}`, 'error');
            }
        });
    }
    
    function showResult(message, type) {
        if (!debugResultEl) return;
        
        const div = document.createElement('div');
        div.className = 'p-3 my-2 rounded';
        
        if (type === 'error') {
            div.className += ' bg-red-100 text-red-800';
        } else if (type === 'success') {
            div.className += ' bg-green-100 text-green-800';
        } else {
            div.className += ' bg-blue-100 text-blue-800';
        }
        
        div.textContent = message;
        
        debugResultEl.appendChild(div);
        
        // Scroll to bottom
        debugResultEl.scrollTop = debugResultEl.scrollHeight;
    }
}); 