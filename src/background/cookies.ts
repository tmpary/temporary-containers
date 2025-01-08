import { TemporaryContainers } from './tmp';
import { Storage } from './storage';
import { PreferencesSchema, Tab, Debug } from '~/types';
import { Utils } from './utils';

export class Cookies {
  private background: TemporaryContainers;
  private debug: Debug;
  private pref!: PreferencesSchema;
  private storage!: Storage;
  private utils!: Utils;

  constructor(background: TemporaryContainers) {
    this.background = background;
    this.debug = background.debug;
  }

  initialize(): void {
    this.pref = this.background.pref;
    this.storage = this.background.storage;
    this.utils = this.background.utils;
  }

  async maybeSetAndAddToHeader(
    request: browser.webRequest._OnBeforeSendHeadersDetails
  ): Promise<void | browser.webRequest._OnBeforeSendHeadersDetails> {
    if (request.tabId < 0 || !Object.keys(this.pref.cookies.domain).length) {
      return;
    }

    let tab;
    try {
      let cookieHeader;
      let cookiesHeader: Record<string, string> = {};
      let cookieHeaderChanged = false;
      for (const domainPattern in this.pref.cookies.domain) {
        if (!this.utils.matchDomainPattern(request.url, domainPattern)) {
          continue;
        }
        if (!tab) {
          tab = (await browser.tabs.get(request.tabId)) as Tab;
          if (!this.storage.local.tempContainers[tab.cookieStoreId]) {
            this.debug(
              '[maybeSetAndAddCookiesToHeader] not a temporary container',
              tab
            );
            return;
          }

          cookieHeader = request.requestHeaders?.find(
            (element): boolean => element.name.toLowerCase() === 'cookie'
          );
          if (cookieHeader && cookieHeader.value) {
            cookiesHeader = cookieHeader.value
              .split('; ')
              .reduce(
                (accumulator: { [key: string]: string }, cookie: string) => {
                  const split = cookie.split('=');
                  if (split.length === 2) {
                    accumulator[split[0]] = split[1];
                  }
                  return accumulator;
                },
                {}
              );
          }
          this.debug(
            '[maybeAddCookiesToHeader] found temp tab and header',
            request,
            cookieHeader,
            cookiesHeader
          );
        }

        for (const cookie of this.pref.cookies.domain[domainPattern]) {
          if (!cookie) {
            continue;
          }
          // website pattern matched request, set cookie
          const setCookie = {
            domain: cookie.domain || undefined,
            expirationDate: cookie.expirationDate
              ? parseInt(cookie.expirationDate, 10)
              : undefined,
            firstPartyDomain: cookie.firstPartyDomain || undefined,
            httpOnly:
              cookie.httpOnly === ''
                ? undefined
                : cookie.httpOnly === 'true',
            name: cookie.name,
            path: cookie.path || undefined,
            secure:
              cookie.secure === ''
                ? undefined
                : cookie.secure === 'true',
            url: cookie.url,
            value: cookie.value || undefined,
            sameSite: cookie.sameSite || undefined,
            storeId: tab.cookieStoreId,
          };
          this.debug('[maybeSetCookies] setting cookie', cookie, setCookie);
          const cookieSet = await browser.cookies.set(setCookie);
          this.debug('[maybeSetCookies] cookie set', cookieSet);

          if (cookiesHeader[cookie.name] === cookie.value) {
            this.debug(
              '[maybeSetCookies] the set cookie is already in the header',
              cookie,
              cookiesHeader
            );
            continue;
          }

          // check if we're allowed to send the cookie with the current request
          try {
            const cookieAllowed = await browser.cookies.get({
              name: cookie.name,
              url: request.url,
              storeId: tab.cookieStoreId,
              firstPartyDomain: cookie.firstPartyDomain || undefined,
            });

            this.debug(
              '[maybeAddCookiesToHeader] checked if allowed to add cookie to header',
              cookieAllowed
            );

            if (cookieAllowed) {
              cookieHeaderChanged = true;
              // eslint-disable-next-line require-atomic-updates
              cookiesHeader[cookieAllowed.name] = cookieAllowed.value;
              this.debug(
                '[maybeAddCookiesToHeader] cookie value changed',
                cookiesHeader
              );
            }
          } catch (error) {
            this.debug('[maybeAddCookiesToHeader] couldnt get cookie', cookie);
          }
        }
      }
      this.debug(
        '[maybeAddCookiesToHeader] cookieHeaderChanged',
        cookieHeaderChanged,
        cookieHeader,
        cookiesHeader
      );
      if (!cookieHeaderChanged) {
        return;
      } else {
        const changedCookieHeaderValues: string[] = [];
        Object.keys(cookiesHeader).map((cookieName) => {
          changedCookieHeaderValues.push(
            `${cookieName}=${cookiesHeader[cookieName]}`
          );
        });
        const changedCookieHeaderValue = changedCookieHeaderValues.join('; ');
        this.debug(
          '[maybeAddCookiesToHeader] changedCookieHeaderValue',
          changedCookieHeaderValue
        );
        if (cookieHeader) {
          cookieHeader.value = changedCookieHeaderValue;
        } else {
          request.requestHeaders?.push({
            name: 'Cookie',
            value: changedCookieHeaderValue,
          });
        }
        this.debug(
          '[maybeAddCookiesToHeader] changed cookieHeader to',
          cookieHeader,
          request
        );
        return request;
      }
    } catch (error) {
      this.debug(
        '[maybeAddCookiesToHeader] something went wrong while adding cookies to header',
        tab,
        request.url,
        error
      );
      return;
    }
  }
}
