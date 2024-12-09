import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
} else {
  const title = document.getElementById('title') as HTMLElement;
  title.innerText = 'SCBAOPMAM (DEV-MODE)';
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
