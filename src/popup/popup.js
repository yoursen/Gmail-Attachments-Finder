
window.onload = function () {

  document.getElementById('searchKeyword').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      search();
    }
  });

  document.getElementById('searchButton').addEventListener('click', function () {
    search();
  });

  function search() {
    const keyword = document.getElementById('searchKeyword').value;
    chrome.runtime.sendMessage({ action: 'searchAttachments', keyword: keyword }, function (response) {
      const resultsDiv = document.getElementById('results');
      resultsDiv.innerHTML = '';

      if (response.results.length === 0) {
        const div = document.createElement('div');
        div.classList.add('attachment');
        div.textContent = 'No attachments found.';
        resultsDiv.appendChild(div);
      } else {
        response.results.forEach(result => {
          console.log(result);

          const div = document.createElement('div');
          div.classList.add('attachment');

          const link = document.createElement('a');
          link.textContent = result.filename;
          link.href = '#';
          link.addEventListener('click', function () {
            chrome.runtime.sendMessage({ action: 'downloadAttachment', messageId: result.messageId, attachmentId: result.attachmentId }, function (response) {
              console.log(response);
              if (response.url) {
                const downloadLink = document.createElement('a');
                downloadLink.href = response.url;
                downloadLink.download = result.filename;
                downloadLink.click();
              }
            });
          });

          div.appendChild(link);
          resultsDiv.appendChild(div);
        });
      }
    });
  }

};
