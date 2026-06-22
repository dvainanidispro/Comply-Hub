
let presentTime = () => {
    let date = new Date();
    return date.toLocaleString('el-GR',{hour12: false});
};

let greekdate = (inputDate) => {
    const date = new Date(inputDate);
    return date.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

let toNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) {
        return null;
    }
    const number = Number(value);
    return isNaN(number) ? null : Number(number.toFixed(decimals));
}

function sortByField(array, fieldName, ascending = true) {
    return array.sort((a, b) => {
        const aValue = a[fieldName];
        const bValue = b[fieldName];
        if (aValue === null || aValue === undefined) return 1;  // null/undefined στο τέλος
        if (bValue === null || bValue === undefined) return -1;
        if (aValue < bValue) return ascending ? -1 : 1;
        if (aValue > bValue) return ascending ? 1 : -1;
        return 0;
    });
}

export { presentTime, greekdate, toNumber, sortByField };