document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-link');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all tabs and content
      tabs.forEach(item => item.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Activate the clicked tab and its content
      const targetTab = tab.dataset.tab;
      document.getElementById(targetTab).classList.add('active');
      tab.classList.add('active');
    });
  });
});
