import { IDAOState } from "@daostack/client";
import { getArc } from "arc";
import Subscribe, { IObservableState } from "components/Shared/Subscribe";
import * as React from "react";
import DaoContainer from "./DaoContainer";
import * as css from "./DaoList.scss";
import { evaluateString } from 'lib/sort';

interface IProps {
  daos: IDAOState[];
}

class DaoListContainer extends React.Component<IProps, null> {

  public render() {
    let { daos } = this.props;
    let genesisAlpha: IDAOState;
    for (const dao of daos) {
      const found = dao.name === 'Genesis Alpha';
      if (found) {
        genesisAlpha = dao;
        break;
      }
    }

    daos = [
      genesisAlpha,
      ...daos.filter((dao: IDAOState) => {
        return dao !== genesisAlpha;
      }).sort((daoA: IDAOState, daoB: IDAOState) => {
        return evaluateString(daoA.name, daoB.name);
      })
    ];
    const daoNodes = daos.map((dao: IDAOState) => {
      return (
        <DaoContainer key={dao.address} address={dao.address} />
      );
    });
    return (
      <div className={css.wrapper}>
        <div className={css.daoListHeader + " clearfix"}>
          <h2 data-test-id="header-all-daos">All DAOs</h2>
        </div>
        {daoNodes ? daoNodes : "None"}
      </div>
    );
  }
}

export default () => {
  const arc = getArc();
  return <Subscribe observable={arc.daos()}>{(state: IObservableState<IDAOState[]>) => {
    if (state.isLoading) {
      return (
        <div className={css.wrapper}>
          <div className={css.loading}><img src="/assets/images/Icon/Loading-black.svg" />
          </div>
        </div>
      );
    } else if (state.error) {
      throw state.error;
    } else {
      return <DaoListContainer daos={state.data} />;
    }
  }

  }</Subscribe>;
};
