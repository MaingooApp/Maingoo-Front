import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-stats-widget',
    imports: [CommonModule],
    templateUrl: './statswidget.html',
    styleUrls: ['./statswidget.scss']
})
export class StatsWidget {}
