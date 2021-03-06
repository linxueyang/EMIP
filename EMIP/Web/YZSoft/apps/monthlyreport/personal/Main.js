﻿
Ext.define('YZSoft.apps.monthlyreport.personal.Main', {
    extend: 'Ext.Container',
    requires: [
        'YZSoft.apps.monthlyreport.model.MonthlyReport'
    ],
    config:{
        account:null
    },

    constructor: function (config) {
        var me = this,
            config = config || {};

        me.btnBack = Ext.create('Ext.Button', {
            cls: ['yz-button-flat', 'yz-button-titlebar'],
            iconCls: 'yz-glyph yz-glyph-e913',
            iconAlign: 'left',
            align: 'left',
            handler: function () {
                if (me.config.back)
                    me.config.back.call(me.scope || me);
            }
        });

        me.titleBar = Ext.create('Ext.TitleBar', {
            docked: 'top',
            title: config.title || '',
            cls: ['yz-titlebar'],
            items: [me.btnBack]
        });


        me.cmpCaption = Ext.create('Ext.Component', {
            xtype: 'component',
            flex: 1,
            cls: 'yz-cmp-footmark-caption',
            tpl: [
                '<div class="title">{title}</div>',
                '<div class="subtitle">' + Ext.String.format(RS.$('MonthlyReport_My_Caption'), '<span class="count">{count}</span>') + '</div>'
            ],
            data: {
                title: config.shortName,
                count: '-'
            }
        });

        me.edtDate = Ext.create('YZSoft.src.field.YearPicker', {
            cls: ['yz-field-box', 'yz-border-width-1', 'yz-field-box-date', 'yz-field-box-year'],
            value: Ext.Date.clearTime(new Date()),
            listeners: {
                scope: me,
                select: 'onSearch'
            }
        });

        me.pnlCaption = Ext.create('Ext.Container', {
            docked: 'top',
            padding: '15 15 15 20',
            layout: {
                type: 'hbox',
                align: 'center'
            },
            items: [{
                xclass: 'YZSoft.src.component.Headshot',
                uid: config.account,
                width: 44,
                height: 44
            }, me.cmpCaption, me.edtDate]
        });

        me.store = Ext.create('Ext.data.Store', {
            model: 'YZSoft.apps.monthlyreport.model.MonthlyReport',
            autoLoad: false,
            loadDelay: false,
            clearOnPageLoad: true,
            pageSize: -1,
            proxy: {
                type: 'ajax',
                url: YZSoft.$url('YZSoft.Services.REST.Mobile/Apps/MonthlyReport.ashx'),
                extraParams: {
                    method: 'GetUserReportsByYear',
                    account: config.account
                }
            }
        });

        me.list = Ext.create('Ext.dataview.List', {
            store: me.store,
            loadingText: '',
            scrollable: {
                direction: 'vertical',
                indicators: false
            },
            cls: ['yz-list-dailyreport'],
            itemCls: ['yz-list-item-flat', 'yz-list-item-border', 'yz-list-item-dailyreport'],
            itemTpl: Ext.create('Ext.XTemplate',
            '<div class="yz-layout-columns">',
                '<div class="yz-column-left yz-column-yearmonth">',
                    '<div class="month">{Date:this.renderMonth}</div>',
                '</div>',
                '<div class="yz-column-center">',
                    '<div class="content">{[this.renderContent(values)]}</div>',
                '</div>',
            '</div>', {
                renderMonth: function (value) {
                    return Ext.Date.format(value, 'F');
                },
                renderContent: function (value) {
                    var lines = [];

                    if (value.Done)
                        lines.push(Ext.util.Format.htmlEncode(value.Done));
                    if (value.Undone)
                        lines.push(Ext.util.Format.htmlEncode(value.Undone));
                    if (value.Coordinate)
                        lines.push(Ext.util.Format.htmlEncode(value.Coordinate));
                    if (value.Comments)
                        lines.push(Ext.util.Format.htmlEncode(value.Comments));

                    return lines.length ? lines.join('<br/>') : Ext.String.format('<span class="empty">{0}</span>', RS.$('All__None'));
                }
            }),
            pressedDelay: YZSoft.setting.delay.pressedDelay,
            disableSelection: true,
            //emptyText: RS.$('TaskList_EmptyText'),
            listeners: {
                itemtap: function (list, index, target, record, e, eOpts) {
                    e.stopEvent();
                    me.onItemTap(target, record);
                }
            }
        });

        var cfg = {
            layout: 'fit',
            items: [me.titleBar, me.pnlCaption, me.list]
        };

        Ext.apply(cfg, config);
        me.callParent([cfg]);

        me.store.on({
            load: function (store) {
                var data = Ext.apply({}, me.cmpCaption.getData()),
                    count = 0;

                store.each(function (record) {
                    if (!record.data.IsEmpty)
                        count++;
                });

                data.count = count;
                me.cmpCaption.setData(data);
            }
        });

        me.on({
            single: true,
            scope: me,
            painted: 'onSearch'
        });
    },

    onSearch: function () {
        var me = this,
            store = me.store,
            params = store.getProxy().getExtraParams(),
            date = me.edtDate.getValue();

        Ext.apply(params, {
            year: date.getFullYear()
        });

        me.store.load();
    },

    onItemTap: function (target, record) {
        var me = this,
            date = record.data.Date,
            uid = YZSoft.LoginUser.Account;

        YZSoft.Ajax.request({
            url: YZSoft.$url('YZSoft.Services.REST.Mobile/Apps/MonthlyReport.ashx'),
            params: {
                method: 'TryGetReport',
                account: uid,
                date: date
            },
            success: function (action) {
                var report = action.result.report,
                    taskid = report ? report.TaskID : -1;

                if (taskid != -1)
                    me.$read(record, report);
                else
                    me.$new(record, report);
            }
        });
    },

    $read: function (record, report) {
        var me = this,
            date = record.data.Date,
            uid = YZSoft.LoginUser.Account,
            pnl;

        pnl = Ext.create('YZSoft.apps.monthlyreport.panel.MonthlyReport', {
            title: RS.$('All_Apps_MonthlyReport'),
            account: uid,
            report: report,
            back: function () {
                Ext.mainWin.pop();
            },
            done: function () {
                me.updateRecord(record);
            }
        });

        Ext.mainWin.push(pnl);
    },

    $new: function (record) {
        var me = this,
            date = record.data.Date,
            uid = YZSoft.LoginUser.Account,
            pnl;

        pnl = Ext.create('YZSoft.form.Post', {
            form: {
                xclass: 'YZSoft.apps.monthlyreport.form.MonthlyReport',
                config: {
                    date: date,
                    listeners: {
                        beforePost: function (form, data) {
                            data.FormData.iMonthlyReport[0].Account = uid;
                        }
                    }
                }
            },
            title: RS.$('MonthlyReport_Post_Title'),
            processName: '$月报',
            prompt: false,
            back: function () {
                Ext.mainWin.pop();
            },
            fn: function () {
                Ext.mainWin.pop();
            },
            done: function () {
                me.updateRecord(record);
            }
        });

        Ext.mainWin.push(pnl);
    },

    updateRecord: function (record) {
        var me = this,
            date = record.data.Date,
            uid = YZSoft.LoginUser.Account;

        YZSoft.Ajax.request({
            url: YZSoft.$url('YZSoft.Services.REST.Mobile/Apps/MonthlyReport.ashx'),
            params: {
                method: 'TryGetReport',
                account: uid,
                date: date
            },
            success: function (action) {
                var report = action.result.report;

                if (report) {
                    Ext.apply(record.data, report);
                    record.commit();
                }
            }
        });
    }
});
