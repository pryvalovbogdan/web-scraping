import fs from 'fs';
import puppeteer, { Browser, Page } from 'puppeteer';

import { downloadImage, sanitizeTitle } from './utils';

const btnDescription = 'div.button.btn-ksenko.btn-light.btn-bright-hover.w-100.fs-10.fs-sm-12.fs-lg-16.fw-500';
const url = 'url_to_website';

(async () => {
  const browser: Browser = await puppeteer.launch({ headless: true });
  const page: Page = await browser.newPage();

  await page.goto(url);
  await page.waitForSelector('#filter_result');

  const results = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.site_cell')).map(item => {
      const titleElement = item.querySelector<HTMLElement>('.title_holder');
      const imgElement = item.querySelector<HTMLImageElement>('img');
      const linkElement = item.querySelector<HTMLAnchorElement>('a');
      const button = item.querySelector<HTMLElement>(btnDescription);

      return {
        title: titleElement ? titleElement.innerText.trim() : null,
        img: imgElement ? imgElement.getAttribute('src') : null,
        link: linkElement ? linkElement.href : null,
        buttonSelector: button ? btnDescription : null,
      };
    }),
  );

  const savedData: Array<{ title: string | null; link: string | null; description: string | null }> = [];

  for (const result of results) {
    console.log('Processing result:', result);
    const sanitizedTitle = sanitizeTitle(result.title || 'unknown_item');
    const filepath = `images/${sanitizedTitle}.jpg`;

    if (result.img) {
      try {
        await downloadImage(result.img, filepath);
        console.log(`Downloaded: ${result.img} -> ${filepath}`);
      } catch (error) {
        console.error(`Failed to download ${result.img}:`, error.message);
      }
    }

    let description: string | null = null;

    if (result.buttonSelector) {
      console.log('Waiting for new page...');
      const [newPage] = await Promise.all([
        new Promise<Page>(resolve =>
          browser.once('targetcreated', async target => {
            console.log('Target created:', target.url());
            const newPage = await target.page();

            if (newPage) {
              await newPage.bringToFront();
              resolve(newPage);
            }
          }),
        ),
        page.click(result.buttonSelector),
      ]);

      if (newPage instanceof Page) {
        await newPage.waitForSelector('content');

        description = await newPage.$eval('content', el => (el as HTMLElement).innerText);

        await newPage.close();
      }
    }

    savedData.push({
      title: result.title,
      link: result.link,
      description: description,
    });
  }

  const jsonFilePath = 'data.json';

  fs.writeFileSync(jsonFilePath, JSON.stringify(savedData, null, 2));
  console.log(`Data saved to ${jsonFilePath}`);

  await browser.close();
})();
