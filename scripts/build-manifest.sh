#!/bin/bash

NETWORK=$1

if [ "$STAGING" ]
then
  FILE=$NETWORK'-staging.json'
else
  FILE=$NETWORK'.json'
fi

DATA=manifest/data/$FILE

echo 'Generating manifest from data file: '$DATA
cat $DATA

mustache \
  -p manifest/templates/sources/ConverterFactory1.yaml \
  -p manifest/templates/sources/ConverterFactory2.yaml \
  -p manifest/templates/sources/Registries.yaml \
  -p manifest/templates/sources/Upgraders.yaml \
  -p manifest/templates/contracts/ContractRegistry.template.yaml \
  -p manifest/templates/contracts/ConverterFactory1.template.yaml \
  -p manifest/templates/contracts/ConverterFactory2.template.yaml \
  -p manifest/templates/contracts/ConverterRegistry.template.yaml \
  -p manifest/templates/contracts/ConverterUpgrader.template.yaml \
  $DATA \
  subgraph.template.yaml > subgraph.yaml
