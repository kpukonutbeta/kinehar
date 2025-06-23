// banner.js - Reusable banner component
class PageBanner extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .banner {
          display: flex;
          align-items: center;
          background-color: #1a73e8;
          color: white;
          padding: 15px 25px;
          margin-bottom: 20px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          font-family: 'Roboto', Arial, sans-serif;
        }
        .banner-logo {
          height: 50px;
          margin-right: 20px;
        }
        .banner-text {
          flex-grow: 1;
        }
        .org-name {
          font-size: 1.8rem;
          font-weight: 500;
          margin: 0;
        }
        .page-title {
          font-size: 1.2rem;
          margin: 5px 0 0 0;
          opacity: 0.9;
        }
        @media (max-width: 600px) {
          .banner { flex-direction: column; text-align: center; padding: 15px; }
          .banner-logo { margin: 0 0 10px 0; }
          .org-name { font-size: 1.5rem; }
        }
      </style>
      <div class="banner">
        <img src="" alt="Organization Logo" class="banner-logo" id="logo">
        <div class="banner-text">
          <h1 class="org-name" id="org-name">Organization</h1>
          <p class="page-title" id="page-title">Page Title</p>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    // Get attributes or use defaults
    const logo = this.getAttribute('logo') || 'https://www.kpu.go.id/images/1627539868logo-kpu.png';
    const orgName = this.getAttribute('org') || 'Your Organization';
    const pageTitle = this.getAttribute('title') || document.title;

    this.shadowRoot.getElementById('logo').src = logo;
    this.shadowRoot.getElementById('org-name').textContent = orgName;
    this.shadowRoot.getElementById('page-title').textContent = pageTitle;
  }
}

customElements.define('page-banner', PageBanner);