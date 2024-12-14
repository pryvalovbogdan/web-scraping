import fs from 'fs';
import https from 'https';

export const generateTitleUrl = (title: string): string => title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

export const downloadImage = (url: string, filepath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);

    https
      .get(url, response => {
        response.pipe(file);

        file.on('finish', () => {
          file.close(err => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      })
      .on('error', error => {
        fs.unlink(filepath, () => reject(error));
      });
  });
};
