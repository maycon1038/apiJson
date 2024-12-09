import {Component, HostListener, OnInit} from '@angular/core';
import {SwUpdate, VersionEvent} from "@angular/service-worker";
import {MatSnackBar} from "@angular/material/snack-bar";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute, NavigationEnd, RouteConfigLoadStart, Router} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {filter, map} from 'rxjs';
import {Service} from './services/app.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public title: string = 'Baile-PMAM';
  public modalVersion!: boolean;
  public isHome: boolean = true;
  public isLoading: boolean = true;
  public modalPwaEvent: any;
  public showModalEvent = false;


  constructor(
    private swUpdate: SwUpdate,
    private snackBar: MatSnackBar,
    private modal: MatDialog,
    private service: Service,
    private router: Router,
    private titleService: Title) {
    // this code set the page title on browser
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd), map(() => {
        let route: ActivatedRoute = this.router.routerState.root;
        let routeTitle = '';
        while (route!.firstChild) {
          route = route.firstChild;
        }
        if (route.snapshot.data['title']) {
          routeTitle = route!.snapshot.data['title'];
        }
        return routeTitle;
      })
    ).subscribe((title: string) => {
      if (title) {
        this.titleService.setTitle(title);
      }
    });
    ///////////////////////////////////////////

    this.router.events.subscribe(res => {
      if (res instanceof RouteConfigLoadStart) {
        this.isLoading = true;
      }
      if (res instanceof NavigationEnd) {
        this.isLoading = false;

        if (res.urlAfterRedirects.includes('/home')) {
          this.isHome = true;
        } else {
          this.isHome = false;
        }
      }
    });
  }

  async ngOnInit(): Promise<void> {
    if (process.env['NODE_ENV'] === 'development') {
      this.service.startEmulators();
    }
  }
}
