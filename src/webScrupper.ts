import fs from 'fs';
import puppeteer, { Browser, Page } from 'puppeteer';

import { ISavedData } from './types';
import { downloadImage, generateTitleUrl } from './utils';

const url = 'url_to_website';
const btnDescriptionSelector = 'div.button.btn-light.btn-bright-hover.w-100.fs-10.fs-sm-12.fs-lg-16.fw-500';
const cardDataSelector = '.site_cell';
const titleSelector = '.title_holder';
const manufactureSelector = 'div.d-flex.justify-content-between.w-100';

(async () => {
  const browser: Browser = await puppeteer.launch({ headless: true });
  const page: Page = await browser.newPage();

  await page.goto(url);

  const results = await page.evaluate(
    ({ cardDataSelector, titleSelector, btnDescriptionSelector, manufactureSelector }) =>
      Array.from(document.querySelectorAll(cardDataSelector)).map(item => {
        const titleElement = item.querySelector<HTMLElement>(titleSelector);
        const imgElement = item.querySelector<HTMLImageElement>('img');
        const linkElement = item.querySelector<HTMLAnchorElement>('a');
        const manufactureElement = item.querySelector<HTMLElement>(manufactureSelector);
        const buttonElement = item.querySelector<HTMLElement>(btnDescriptionSelector);

        if (linkElement) {
          linkElement.removeAttribute('target');
        }

        return {
          title: titleElement ? titleElement.innerText.trim() : null,
          img: imgElement ? imgElement.getAttribute('src') : null,
          link: linkElement ? linkElement.href : null,
          manufacture: manufactureElement ? manufactureElement.innerText : null,
          buttonSelector: buttonElement ? btnDescriptionSelector : null,
        };
      }),
    { cardDataSelector, titleSelector, btnDescriptionSelector, manufactureSelector },
  );

  const savedData: Array<ISavedData> = [];

  for (const result of results) {
    console.log('Processing result:', result);
    const sanitizedTitle = generateTitleUrl(result.title || 'unknown_item');
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

    if (result.link) {
      try {
        console.log(`Navigating to: ${result.link}`);
        await page.goto(result.link, { waitUntil: 'domcontentloaded' });

        await page.waitForSelector('content', { timeout: 5000 });
        description = await page.$eval('content', el => (el as HTMLElement).innerText);
        console.log(`Description extracted: ${description}`);
      } catch (error) {
        console.error(`Failed to extract description from ${result.link}:`, error.message);
      }

      await page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    savedData.push({
      title: result.title,
      link: result.link,
      manufacture: result.manufacture,
      description: description || '',
    });
  }

  const jsonFilePath = 'data.json';

  fs.writeFileSync(jsonFilePath, JSON.stringify(savedData, null, 2));
  console.log(`Data saved to ${jsonFilePath}`);

  await browser.close();
})();
