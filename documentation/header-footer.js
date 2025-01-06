
module.exports = {
    header: {
        height: "2cm",
        contents: function(pageNum, numPages) {
            return '<div style="text-align: right; font-size: 8pt; color: #666;">' +
                   '<span style="float: left;">EyeNet Project</span>' +
                   'Progress Report - Page ' + pageNum + ' of ' + numPages +
                   '</div>';
        }
    },
    footer: {
        height: "2cm",
        contents: function(pageNum, numPages) {
            return '<div style="text-align: center; font-size: 8pt; color: #666;">' +
                   'Generated on ' + new Date().toLocaleDateString() +
                   '</div>';
        }
    }
};