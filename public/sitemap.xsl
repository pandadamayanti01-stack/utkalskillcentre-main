<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/html401"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>Dynamic XML Sitemap | Utkal Skill Centre</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            color: #cbd5e1;
            background-color: #060913;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
            background: rgba(15, 23, 42, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(12px);
            border-radius: 24px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          }
          h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 900;
            margin: 0 0 10px 0;
            letter-spacing: -0.025em;
          }
          p {
            color: #94a3b8;
            margin: 0 0 20px 0;
            font-weight: 500;
          }
          a {
            color: #10b981;
            text-decoration: none;
            font-weight: 600;
          }
          a:hover {
            text-decoration: underline;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            text-align: left;
            padding: 12px 10px;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
            color: #10b981;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          td {
            padding: 12px 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            word-break: break-all;
            color: #e2e8f0;
          }
          tr:hover td {
            background: rgba(255, 255, 255, 0.02);
          }
          .priority {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Utkal Skill Centre XML Sitemap</h1>
          <p>This is a dynamic XML Sitemap, generated automatically to assist search engine indexing.<br/>It contains <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs.</p>
          <table>
            <thead>
              <tr>
                <th style="width: 70%">URL (Location)</th>
                <th style="width: 15%">Priority</th>
                <th style="width: 15%">Change Freq</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                  </td>
                  <td class="priority">
                    <xsl:value-of select="sitemap:priority"/>
                  </td>
                  <td>
                    <xsl:value-of select="sitemap:changefreq"/>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
