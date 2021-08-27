import 'https://code.jquery.com/jquery-3.6.0.min.js'

const header = $('<header id="header"></header>')
header.load('/assets/components/navigation-header.html')
$('body').prepend(header)
