import { HttpClient, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom, isDevMode } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import Aura from '@primeng/themes/aura';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { httpErrorInterceptor } from './app/core/interceptors/http-error.interceptor';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { primengEs } from './assets/i18n/primeng-es';
import { provideServiceWorker } from '@angular/service-worker';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

export function httpLoaderFactory(http: HttpClient): TranslateHttpLoader {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideAnimationsAsync(),
        importProvidersFrom(
            TranslateModule.forRoot({
                defaultLanguage: 'es',
                loader: {
                    provide: TranslateLoader,
                    useFactory: httpLoaderFactory,
                    deps: [HttpClient]
                }
            })
        ),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } }, translation: primengEs }),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor, httpErrorInterceptor])),
        ConfirmationService,
        MessageService,
        provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
        })
    ]
};
