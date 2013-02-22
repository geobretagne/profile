Ext.namespace("GEOR.Addons");

GEOR.Addons.profilechart = function (map, layers, options, color, feature, id, process) {
    this.id = id;
    this.map = map;
    this.layers = layers;
    this.options = options;
    this.color = color;
    this.aaa = null;
    this.feature = feature;
    this.process = process;
    this.resultProcess = null;
    this.marks = null;
    this.win = null;
    this.events = new Ext.util.Observable();
    this.events.addEvents("wpssuccess");
    this.events.addEvents("wpserror");
    this.events.addEvents("wpsclose");
    this.getProfile = function (option, parameters) {
        GEOR.waiter.show();
        _self = this;
        _parameters = parameters;
        // process configuration
        this.process.dataInputs[0].data = {
            literalData: {
                value: parameters.pas.value
            }
        };
        this.process.dataInputs[1].data = {
            literalData: {
                value: "json"
            }
        };
        this.process.dataInputs[2].data = {
            complexData: {
                mimeType: "text/xml",
                value: _convertToGML(this.feature)
            }
        };
        this.process.dataInputs[3].data = {
            literalData: {
                value: parameters.referentiel.value
            }
        };
        //this.process.responseForm = {rawDataOutput: {identifier: "result"}}; 
        this.process.responseForm = {
            responseDocument: {
                storeExecuteResponse: true,
                output: {
                    asReference: false,
                    identifier: 'result'
                }
            }
        };

        // process execute
        if (option == "new") {
            OpenLayers.Request.POST({
                url: this.options.wpsurl,
                data: new OpenLayers.Format.WPSExecute().write(this.process),
                success: _onExecuted,
                failure: _onError
            });
        } else {
            OpenLayers.Request.POST({
                url: this.options.wpsurl,
                data: new OpenLayers.Format.WPSExecute().write(this.process),
                success: _updateChart,
                failure: _onErrorUpdated
            });
        }
    };

    /**
     * APIMethod: create
     * Return a  {Ext.menu.Item} for GEOR_addonsmenu.js and initialize this module.16:21 13/06/2012
     *
     * Parameters:
     * m - {OpenLayers.Map} The map instance, {wpsconfig} the wps tool options.
     */
    this.chart = function () {
        var lang = OpenLayers.Lang.getCode();
        _color = this.color;
        _map = this.map;
        _drawLayer = this.layers[0];
        _markersLayer = this.layers[1];
        _resultLayer = this.layers[2];
        _config = this.options;
        if (_config.chart) {
            Ext.chart.Chart.CHART_URL = _config.chart;
        }
        var win = _createChart();
        win.render(Ext.getBody());
        this.win = win;
        return win;
    };
    this.destroy = function () {
        this.map = null;
        this.options = null;
        this.color = null;
        this.resultProcess = null;
        this.feature.destroy();
        Ext.each(this.marks, function (f, i) {
            f.destroy();
        });
        this.events = null;
        this.layers = null;
        if (this.win) {
            this.win.destroy();
        }
    };


    /*
     * Private
     */
    /**
     * Property: _mask_loaders
     * Array of {Ext.LoadMask} .
     */
    var _mask_loader = null;

    var _self = null;

    var _parameters = null;   
    
    /**
     * Property: _map
     * {OpenLayers.Map} The map instance.
     */
    var _map = null;

    var _color = null;

    var _data = null;



    /**
     * Property: url
     * String The WPS MNT instance.
     */

    /**
     * Property: config
     *{Object} Hash of options, with keys: pas, referentiel.
     */

    var _config = null;

    var _configForm = null;

    var _lineChart = null;

    var _infosForm = null;

    var _tabs = null;

    /**
     * Property: colors
     *[Array] Hash of colors.
     */


    /**
     * Property: _drawLayer
     * {OpenLayers.Layer.Vector}.
     */

    var _drawLayer = null;

    /**
     * Property: _markersLayer
     * {OpenLayers.Layer.Markers}.
     */
    var _markersLayer = null;

    var _resultLayer = null;


    var tr = function (str) {
        return OpenLayers.i18n(str);
    };


    /**
     * Method: createParametersForm
     * Return a Form with tool parameters
     *
     *Parameter optional jobid integer, link with a Graphic Window
     */
    var createParametersForm = function () {
        var referentielStore = new Ext.data.SimpleStore({
            fields: [{
                name: "value",
                mapping: 0
            }],
            data: _parameters.referentiel.allowedValues
        });
        var pasStore = new Ext.data.SimpleStore({
            fields: [{
                name: "value",
                mapping: 0
            }],
            data: _parameters.pas.allowedValues
        });
        var referentielCombo = new Ext.form.ComboBox({
            name: "referentiel",
            fieldLabel: _parameters.referentiel.title,
            store: referentielStore,
            valueField: "value",
            value: _parameters.referentiel.value,
            displayField: "value",
            editable: false,
            mode: "local",
            triggerAction: "all",
            listWidth: 167
        });
        var pasCombo = new Ext.form.ComboBox({
            name: "pas",
            fieldLabel: _parameters.pas.title,
            store: pasStore,
            valueField: "value",
            value: _parameters.pas.value,
            displayField: "value",
            editable: false,
            mode: "local",
            triggerAction: "all",
            listWidth: 167
        });
        _configForm = new Ext.FormPanel({
            labelWidth: 100,
            layout: "form",
            bodyStyle: "padding: 10px",
            height: 200,
            title: tr("addonprofile.parameters"),
            defaults: {
                width: 200
            },
            defaultType: "textfield",
            items: [referentielCombo, pasCombo],
            buttons: [{
                text: tr("addonprofile.refresh"),
                handler: function () {
                    updateChartConfig();
                }
            }]
        });

        return _configForm;
    };



    /**
     * Method: addmarksfeatures
     * matérialise le sens de numérisation de la polyligne         *
     * Parameters:
     * graphicHandler - integer Identifiant de la fenêtre Graphique
     */
    var addmarksfeatures = function (infos) {
        var beginPoint = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(infos.firstpointX, infos.firstpointY));
        /*beginPoint.attributes = {
                profile: parseInt(jobid, 10)
            };*/
        beginPoint.style = {
            pointRadius: 7,
            externalGraphic: "app/addons/profile/img/icon-one.png",
            graphicZIndex: 701
        };
        var endPoint = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(infos.lastpointX, infos.lastpointY));
        /*endPoint.attributes = {
                profile: parseInt(jobid, 10)
            };*/
        endPoint.style = {
            pointRadius: 7,
            externalGraphic: "app/addons/profile/img/icon-two.png",
            graphicZIndex: 701
        };
        _self.marks = [beginPoint, endPoint];
        _resultLayer.addFeatures(_self.marks);
    };
    /*
     * Method: removedrawfeatures
     * Supprime le tracé profil correspondant au Graphique
     *
     * Parameters:
     * 
     */
    var removedrawfeatures = function () {
        //var feature = _drawLayer.getFeaturesByAttribute("profile", parseInt(graphicHandler, 10));
        _drawLayer.removeFeatures(_self.feature);
        removemarksfeatures();

    };

    var removemarksfeatures = function () {
        _resultLayer.removeFeatures(_self.marks);
    };

    /**
     * Method: convertToGML
     * Convertit un feature au format GML
     *
     * Parameters:
     * feature - {OpenLayers.Feature.Vector}
     */
    var _convertToGML = function (feature) {
        var gmlP = new OpenLayers.Format.GML();
        var inGML = gmlP.write(feature).replace(/<\?xml.[^>]*>/, "");
        return inGML;
    };


    /**
     * Method: convert2csv
     * Appelle le service de téléchargement csv
     * Parameters:
     * data - {JSON Data}.
     */
    var convert2csv = function (data) {
        var format = new OpenLayers.Format.JSON();
        OpenLayers.Request.POST({
            url: "ws/csv/",
            data: format.write({
                columns: ["distance", "x", "y", "altitude", "pente"],
                data: data
            }),
            success: function (response) {
                var o = Ext.decode(response.responseText);
                window.location.href = o.filepath;
            }
        });
    };

    /**
     * Method: updateChartConfig
     * Modifie les valeurs Référentiel et pas avant un nouvel appel du service WPS
     * Parameters:
     * jobid - integer Handler de la fenêtre.
     */
    var updateChartConfig = function () {
        //Création des messages de Loading
        _mask_loader = new Ext.LoadMask(_configForm.getEl().getAttribute("id"), {
            msg: tr("addonprofile.update")
        });

        _mask_loader.show();
        var parameters = {
            pas: {
                value: _configForm.getForm().findField("pas").getValue()
            },
            referentiel: {
                value: _configForm.getForm().findField("referentiel").getValue()
            }
        };

        // _self.events.fireEvent("queryupdate",_self.feature,"update",parameters) ;

        _self.getProfile("update", parameters);
    };
    /**
     * Method: updatedChart
     * Callback executed when the the WPS Execute (update) response is received
     * Parameters:
     * process - {WPS.Process}.
     */
    //removemarksfeatures
    var _updateChart = function (resultProcess) {
        var obj = getResult(resultProcess);
        if (obj && obj.profile && obj.profile.points.length > 0) {
            _self.resultProcess = obj;
            _data = obj.profile;            
            var infos = _self.resultProcess.profile.infos;
            removemarksfeatures();
            addmarksfeatures(infos);
            var store = new Ext.data.JsonStore({
                fields: [{
                    name: "d",
                    mapping: 0
                }, {
                    name: "x",
                    mapping: 1
                }, {
                    name: "y",
                    mapping: 2
                }, {
                    name: "z",
                    mapping: 3
                }, {
                    name: "pente",
                    mapping: 4
                }]
            });
            store.loadData(obj.profile.points);             
            console.log("infos :", infos);
            if (_infosForm.body) {
                _infosForm.update(infos);
                _registerTips();
            }                     
            _lineChart.store = store;
            _lineChart.xAxis.title = "Distance (m)" + " sources : (" + infos.referentiel + ")";
            _mask_loader.hide();
            GEOR.waiter.hide();
            _tabs.setActiveTab(0);

        } else {
            var format = new OpenLayers.Format.XML();
            var doc = format.read(resultProcess.responseText);
            var node = format.getElementsByTagNameNS(doc, "*", "ExceptionText")[0];
            var msg = (node.innerText || node.text || node.textContent).trim();
            _self.events.fireEvent("wpserror", msg, _self)
            GEOR.waiter.hide();
        }

    };

    var _parseExecuteOutput = function (outputs, dom) {
        var owsNS = "http://www.opengis.net/ows/1.1";
        var wpsNS = "http://www.opengis.net/wps/1.0.0";
        var identifier = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(dom, owsNS, "Identifier")[0].firstChild.nodeValue;
        outputs[identifier] = {};
        var output = outputs[identifier];
        var literalData = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(dom, wpsNS, "LiteralData");
        var complexData = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(dom, wpsNS, "ComplexData");
        var reference = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(dom, wpsNS, "Reference");

        if (reference.length > 0) {
            output.value(OpenLayers.Format.XML.prototype.getAttributeNS(reference[0], "", "href"));
        } else if (literalData.length > 0) {
            output.value = (OpenLayers.Format.XML.prototype.concatChildValues(literalData[0]));
        } else if (complexData.length > 0) {
            // set output do DOM
            nodes = new Array();
            for (var i = 0; i < complexData[0].childNodes.length; i++) {
                var node = complexData[0].childNodes[i];
                if (node.nodeType == 1) {
                    nodes.push(node);
                }
                if (node.nodeType == 3) {
                    nodes.push(complexData[0].textContent);
                }
            }
            output.value = nodes;
        }


    };

    var _getStatusExecute = function (dom) {
        var test = (dom[0].firstElementChild || dom[0].firstChild);
        return (test.nodeName == "wps:ProcessSucceeded") ? "success" : "fail";
    };

    var getResult = function (resultProcess) {
        // responseDocument with XML response
        var obj = null;
        var format = new OpenLayers.Format.XML();
        var doc = format.read(resultProcess.responseText);
        var domStatus = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(doc, "http://www.opengis.net/wps/1.0.0", "Status");
        if (_getStatusExecute(domStatus) === "success") {
            if (format.getElementsByTagNameNS(doc, "*", "Output")) {
                var domOutputs = format.getElementsByTagNameNS(doc, "*", "Output");
                var outputs = {};
                for (var i = 0; i < domOutputs.length; i++) {
                    _parseExecuteOutput(outputs, domOutputs[i]);
                }
                obj = (new OpenLayers.Format.JSON()).read(outputs["result"].value);
            }
            return obj;
        }
    };

    var _onExecuted = function (resultProcess) {
        var obj = getResult(resultProcess);
        if (obj && obj.profile && obj.profile.points.length > 0) {
            _self.resultProcess = obj;
            _data = obj.profile;
            _self.events.fireEvent("wpssuccess", _self);
        } else {
            var format = new OpenLayers.Format.XML();
            var doc = format.read(resultProcess.responseText);
            var node = format.getElementsByTagNameNS(doc, "*", "ExceptionText")[0];
            var msg = (node.innerText || node.text || node.textContent).trim();
            _self.events.fireEvent("wpserror", msg, _self)
            GEOR.waiter.hide();
        }

    };

    /**
     * Method: onError
     * Callback executed when the the WPS Execute Error response is received
     * Parameters:
     * process - {WPS.Process}.
     */
    var _onError = function (r) {
        GEOR.util.errorDialog({
            title: tr("addonprofile.error"),
            msg: "erreur"
        });
        GEOR.waiter.hide();
    };


    /**
     * Method: onErrorUpdated
     * Callback executed when the the WPS Execute Updated Error response is received
     * Parameters:
     * process - {WPS.Process}.
     */
    var _onErrorUpdated = function (r) {
        GEOR.util.errorDialog({
            title: tr("addonprofile.error"),
            msg: "erreur"
        });
        _mask_loader.hide();
        GEOR.waiter.hide();

    };
    
    var _registerTips = function () {
        var tip1 = new Ext.ToolTip({
                    target: 'wps-process-div',
                    html: tr("addonprofile.processedpoints")
        });
        var tip2 = new Ext.ToolTip({
                    target: 'wps-referentiel-div',
                    html: tr("addonprofile.referential")
        });
        var tip3 = new Ext.ToolTip({
                    target: 'wps-distance-div',
                    html: tr("addonprofile.totaldistance")
        });
        var tip4 = new Ext.ToolTip({
                    target: 'wps-positive-div',
                    html: tr("addonprofile.positivecumul")
        });
        var tip5 = new Ext.ToolTip({
                    target: 'wps-negative-div',
                    html: tr("addonprofile.negativecumul")
        });        
    };
    /**
     * Method: onExecuted
     * Callback executed when the the WPS Execute response is received
     * Parameters:
     * process - {WPS.Process}.
     */
    var _createChart = function () {
        var infos = _self.resultProcess.profile.infos;
        addmarksfeatures(infos);
        var longueur = infos.distance;
        _drawLayer.setZIndex(600);
        _resultLayer.setZIndex(601);
        _markersLayer.setZIndex(602);
        var store = new Ext.data.JsonStore({
            fields: [{
                name: "d",
                mapping: 0
            }, {
                name: "x",
                mapping: 1
            }, {
                name: "y",
                mapping: 2
            }, {
                name: "z",
                mapping: 3
            }, {
                name: "pente",
                mapping: 4
            }]
        });
        store.loadData(_self.resultProcess.profile.points);
        _lineChart = new Ext.chart.LineChart({
            store: store,
            title: tr("addonprofile.chart"),
            xField: "d",
            yAxis: new Ext.chart.NumericAxis({
                labelRenderer: Ext.util.Format.numberRenderer("0")
            }),
            xAxis: new Ext.chart.NumericAxis({
                title: tr("addonprofile.distance") + " " + tr("addonprofile.sources") + " : " + "(" + infos.referentiel + ")"
            }),
            tipRenderer: function (chart, record) {
                return tr("addonprofile.elevation") + " : " + record.data.z + " m" + "\n" + tr("addonprofile.distance") + " : " + record.data.d + " m" + "\n" + tr("addonprofile.inclination") + " : " + Ext.util.Format.number(record.data.pente, "0.0") + "%";
            },
            extraStyle: {
                padding: 10,
                animationEnabled: true,
                yAxis: {
                    color: 0x3366cc,
                    majorTicks: {
                        color: 0x3366cc,
                        length: 4
                    },
                    minorTicks: {
                        color: 0x3366cc,
                        length: 2
                    },
                    majorGridLines: {
                        size: 1,
                        color: 0xdddddd
                    }
                },
                xAxis: {
                    color: 0x3366cc,
                    majorTicks: {
                        color: 0x3366cc,
                        length: 4
                    },
                    minorTicks: {
                        color: 0x3366cc,
                        length: 2
                    },
                    majorGridLines: {
                        size: 1,
                        color: 0xdddddd
                    }
                }
            },
            series: [{
                type: "line",
                yField: "z",
                style: {
                    color: _color,
                    // couleur de  la ligne
                    lineSize: 1,
                    //taille de la ligne
                    fillColor: _color,
                    // couleurs des points
                    fillAlpha: 0.8,
                    // Opacité des points
                    size: 4 // taille des points
                }
            }],
            listeners: {
                itemmouseover: function (o) {
                    _markersLayer.clearMarkers();
                    var ptResult = new OpenLayers.LonLat(o.item.x, o.item.y);
                    var size = new OpenLayers.Size(20, 34);
                    var offset = new OpenLayers.Pixel(-(size.w / 2), -size.h);
                    var icon = new OpenLayers.Icon("app/addons/profile/img/googlemarker.png", size, offset);
                    _markersLayer.addMarker(new OpenLayers.Marker(ptResult, icon));
                },
                itemmouseout: function (o) {
                    _markersLayer.clearMarkers();
                }
            }
        });   
        
        
            
        var tpl = new Ext.Template(
                    '<div class="wps-div"><div id="wps-referentiel-div" class="wps-referentiel">{referentiel}</div>',
                    '<div id="wps-distance-div" class="wps-distance">{distance} m</div>',
                    '<div id="wps-positive-div" class="wps-positive">{denivelepositif} m</div>',
                    '<div id="wps-negative-div" class="wps-negative">{denivelenegatif} m</div>',
                    '<div id="wps-process-div" class="wps-process">{processedpoints} points interpolés en {executedtime} secondes</div></div>'                    
                );
       
        
        _infosForm = new Ext.Panel({            
            tpl:tpl,
            data: infos,            
            bodyStyle: "padding: 10px",
            title: tr("addonprofile.properties"),
            listeners: {'afterrender' : function(p) {
                p.update(_data.infos);
                _registerTips();
                }
            },
            bbar:[{
                iconCls: "geor-btn-download",
                text:tr("addonprofile.csvdownload"),
                tooltip: tr("addonprofile.csvdownload"),
                handler: function () {
                    convert2csv(_data.points);
                }
            }]        
        });
        
        //tpl.overwrite(_infosForm.body, infos);
        var configForm = createParametersForm();

        _tabs = new Ext.TabPanel({
            activeTab: 0,
            //id: "tabpanel" + jobid,
            autoHeight: false,
            height: 224,
            items: [_lineChart, _infosForm, configForm]
        });

        var chartWindow = new Ext.Window({
            closable: true,
            //id: "profile" + jobid,
            title: tr("addonprofile.charttitle") + _self.id,
            pageX: 10,
            pageY: Ext.getBody().getHeight() - (250 + (parseInt(_self.id, 10) * 20)),
            resizable: true,
            width: 600,
            //height   : 450,
            border: false,
            plain: true,
            region: "center",
            items: [_tabs],
            listeners: {
                "close": function () {
                    //removedrawfeatures();                        
                    _self.events.fireEvent("wpsclose", _self);
                    _self.destroy();
                }
            }
        });
        return chartWindow;
        GEOR.waiter.hide();
    };
};