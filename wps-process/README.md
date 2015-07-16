Process pywps
=============
Le script python getProfileProcess est un Géotraitement [pywps] inspiré pour la partie densification de (https://svn.osgeo.org/gdal/trunk/gdal/swig/python/samples/densify.py)
Copier ce fichier dans le dossier processes d'une instance [pywps] (http://pywps.wald.intevation.org/documentation/process.html)

Principe
========
Sur la base d'une polyligne passée en paramètre, le process retourne un tableau de points enrichi de l'altitude calculée pour chaque point

paramètres d'entrée
===================
* géométrie (gml)
* projection (projection associée à la géométrie)
* format de sortie (json|texte)
* référentie utilisé (si plusieurs mnt sont disponibles, il faut indiquer lequel utiliser)

Exemple de réponse WPS
```<?xml version="1.0" encoding="utf-8"?>
<wps:ExecuteResponse xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" 
xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsExecute_response.xsd" 
service="WPS" version="1.0.0" xml:lang="en-CA" 
serviceInstance="http://geobretagne.fr/wps/mnt?service=WPS&amp;request=GetCapabilities&amp;version=1.0.0" 
statusLocation="http://geobretagne.fr/wps/outputs/pywps-143705296593.xml">
    <wps:Process wps:processVersion="2.1">
        <ows:Identifier>getProfileProcess3</ows:Identifier>
        <ows:Title>Profil en long v2.1</ows:Title>
        <ows:Abstract>Generer un profil depuis une ligne passee en parametre, limite de 10000 points</ows:Abstract>
    </wps:Process>
    <wps:Status creationTime="2015-07-16T15:22:46Z">
        <wps:ProcessSucceeded>PyWPS Process getProfileProcess3 successfully calculated</wps:ProcessSucceeded>
    </wps:Status>
    <wps:ProcessOutputs>
        <wps:Output>
            <ows:Identifier>result</ows:Identifier>
            <ows:Title>Profil calcule</ows:Title>
            <wps:Data>
                <wps:LiteralData dataType="string">{"profile":{"points": [[0,-469843,6127887,92.00,0.00],[199,-469561,6127787,91.00,-0.50],
                [399,-469279,6127687,84.00,-3.50],[599,-468997,6127587,74.00,-5.00],[799,-468715,6127486,78.00,2.00],
                [...],[3998,-464206,6125881,131.00,0.00]],
                "infos": {"denivelepositif":69.0,"denivelenegatif":-30.0,"distance":3998.38,"firstpointX":"-469843.501939","firstpointY":"6127887.7692",
                "lastpointX":"-464206.271104","lastpointY":"6125881.29721","referentiel":"bdalti",
                "processedpoints":"21","nodata":"-9999.0","executedtime":"0.240916013718","gdalversion":"1100100"}}}</wps:LiteralData>
            </wps:Data>
        </wps:Output>
    </wps:ProcessOutputs>
</wps:ExecuteResponse>```

TODO
====
Le traitement fonctionne pour le moment avec des mnt projetés dans un système métrique (EPSG:2154)
Il ne fonctionne pas avec des mnt en (EPSG:4326)








