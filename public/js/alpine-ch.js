
// Load this script just before Alpine.js to use it.

document.addEventListener('alpine:init', () => {

    Alpine.store('unitLabel', {amount: 'πλήθος', hours: 'ώρες', percentage: 'ποσοστό %'});
    Alpine.store('unit', {amount: '', hours: ' ώρες', percentage: ' %'});

    // Example of use: x-data="{elements:$fetch('/api/elements')}
    Alpine.magic('fetch', () => (url, options = {}) => {
        let data = Alpine.reactive({});
        
        fetch(url, options)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(json => {
                Object.assign(data, json);
            })
            .catch(error => {
                console.error("Error fetching data:", error);
            });
        
        return data;
    });
});